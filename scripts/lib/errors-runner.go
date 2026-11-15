// Local educational runner, not a general-purpose Go sandbox. Only a bounded
// functions over scalar values and bounded string slices can reach Go.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

const sourceLimit = 12000
const outputLimit = 24000

type request struct {
	Code  string `json:"code"`
	Input string `json:"input"`
}

type reply struct {
	OK         bool   `json:"ok"`
	Stdout     string `json:"stdout"`
	Diagnostic string `json:"diagnostic"`
	Phase      string `json:"phase"`
}

func result(ok bool, phase, stdout, diagnostic string) reply {
	return reply{OK: ok, Phase: phase, Stdout: stdout, Diagnostic: diagnostic}
}

// Estimates deliberately overestimate every possible string's byte length and
// every constant's bit size. This bounds doubling strings and chained constant
// multiplication before the compiler sees them, not just the final stdout.
type bound struct {
	text int
	bits int
}

type binding struct {
	size     bound
	scanner  bool
	sequence bool
}

type budget struct {
	nodes, statements, bindings, output int
}

type guard struct {
	loopDepth  int
	scopes     []map[string]binding
	budget     *budget
	functions  map[string]functionSpec
	resultType string
}

type functionSpec struct {
	params []string
	result string
}

func (g *guard) userCall(call *ast.CallExpr, depth int) (bound, bool) {
	name, ok := call.Fun.(*ast.Ident)
	if !ok || name.Name == "main" || call.Ellipsis.IsValid() {
		return bound{}, false
	}
	spec, ok := g.functions[name.Name]
	if !ok || len(call.Args) != len(spec.params) {
		return bound{}, false
	}
	if _, shadowed := g.lookup(name.Name); shadowed {
		return bound{}, false
	}
	for _, arg := range call.Args {
		if _, ok := g.expression(arg, depth+1); !ok || g.isScanner(arg) {
			return bound{}, false
		}
	}
	if strings.Contains(spec.result, "string") {
		return bound{4096, 64}, true
	}
	return bound{64, 64}, true
}

func (g *guard) lookup(name string) (binding, bool) {
	for i := len(g.scopes) - 1; i >= 0; i-- {
		if value, ok := g.scopes[i][name]; ok {
			return value, true
		}
	}
	return binding{}, false
}

func (g *guard) packageName(name string) bool {
	_, shadowed := g.lookup(name)
	return !shadowed
}

func (g *guard) isScanner(expr ast.Expr) bool {
	switch e := expr.(type) {
	case *ast.ParenExpr:
		return g.isScanner(e.X)
	case *ast.Ident:
		value, ok := g.lookup(e.Name)
		return ok && value.scanner
	case *ast.CallExpr:
		if selector, ok := e.Fun.(*ast.SelectorExpr); ok {
			if pkg, ok := selector.X.(*ast.Ident); ok {
				return pkg.Name == "bufio" && g.packageName(pkg.Name) && selector.Sel.Name == "NewScanner"
			}
		}
	}
	return false
}

func copyScopes(scopes []map[string]binding) []map[string]binding {
	result := make([]map[string]binding, len(scopes))
	for i, scope := range scopes {
		result[i] = make(map[string]binding, len(scope))
		for name, value := range scope {
			result[i][name] = value
		}
	}
	return result
}

// Every branch starts with the same state. Merge component-wise maxima,
// including the unchanged path, even if there is an else/default. Never let a
// later, smaller branch erase an earlier branch's bound. Locals are discarded
// on scope exit, while assignments to enclosing bindings survive.
func mergeScopes(into, branch []map[string]binding) {
	for i, scope := range into {
		for name, value := range scope {
			other := branch[i][name]
			value.size.text = max(value.size.text, other.size.text)
			value.size.bits = max(value.size.bits, other.size.bits)
			value.scanner = value.scanner && other.scanner
			value.sequence = value.sequence && other.sequence
			into[i][name] = value
		}
	}
}

func (g *guard) expression(expr ast.Expr, depth int) (bound, bool) {
	g.budget.nodes++
	if depth > 24 || g.budget.nodes > 1200 {
		return bound{}, false
	}
	var size bound
	switch e := expr.(type) {
	case *ast.Ident:
		if len(e.Name) > 64 {
			return bound{}, false
		}
		if value, ok := g.lookup(e.Name); ok {
			size = value.size
		} else if e.Name == "true" || e.Name == "false" {
			return bound{5, 1}, true
		} else {
			// Unknown names are left to the compiler; calls/selectors remain
			// independently allowlisted.
			size = bound{64, 64}
		}
	case *ast.BasicLit:
		switch e.Kind {
		case token.STRING:
			value, err := strconv.Unquote(e.Value)
			if err != nil || len(value) > 2048 {
				return bound{}, false
			}
			size = bound{len(value), 1}
		case token.INT, token.FLOAT:
			// Exponents must be small even for constants Go can represent.
			// Parsing as float also excludes huge integer literals cheaply.
			if len(e.Value) > 32 {
				return bound{}, false
			}
			literal := strings.ReplaceAll(e.Value, "_", "")
			value, err := strconv.ParseFloat(literal, 64)
			if e.Kind == token.INT {
				integer, intErr := strconv.ParseUint(literal, 0, 64)
				value, err = float64(integer), intErr
			}
			if err != nil || value > 1e18 || value < -1e18 || (value != 0 && value < 1e-18 && value > -1e-18) {
				return bound{}, false
			}
			if e.Kind == token.FLOAT && strings.ContainsAny(e.Value, "eEpP") {
				at := strings.LastIndexAny(e.Value, "eEpP")
				exponent, err := strconv.Atoi(strings.ReplaceAll(e.Value[at+1:], "_", ""))
				if err != nil || exponent < -18 || exponent > 18 {
					return bound{}, false
				}
			}
			size = bound{64, 64}
		default:
			return bound{}, false
		}
	case *ast.CallExpr:
		if id, ok := e.Fun.(*ast.Ident); ok {
			if id.Name == "len" || id.Name == "append" {
				if _, shadow := g.lookup(id.Name); shadow || e.Ellipsis.IsValid() {
					return bound{}, false
				}
				if id.Name == "len" {
					if len(e.Args) != 1 || !g.isSequence(e.Args[0]) {
						return bound{}, false
					}
					_, ok := g.expression(e.Args[0], depth+1)
					return bound{64, 64}, ok
				}
				if len(e.Args) < 2 || len(e.Args) > 8 || !g.isSequence(e.Args[0]) {
					return bound{}, false
				}
				for _, arg := range e.Args {
					if _, ok := g.expression(arg, depth+1); !ok {
						return bound{}, false
					}
				}
				return bound{4096, 64}, true
			}
			return g.userCall(e, depth)
		}
		selector, ok := e.Fun.(*ast.SelectorExpr)
		if !ok || e.Ellipsis.IsValid() {
			return bound{}, false
		}
		receiver, ok := selector.X.(*ast.Ident)
		if !ok {
			return bound{}, false
		}
		if receiver.Name == "bufio" && g.packageName("bufio") && selector.Sel.Name == "NewScanner" && len(e.Args) == 1 {
			source, ok := e.Args[0].(*ast.SelectorExpr)
			if !ok || source.Sel.Name != "Stdin" {
				return bound{}, false
			}
			pkg, ok := source.X.(*ast.Ident)
			return bound{64, 64}, ok && pkg.Name == "os" && g.packageName("os")
		}
		if receiver.Name == "strings" && g.packageName("strings") && selector.Sel.Name == "Contains" && len(e.Args) == 2 {
			for _, arg := range e.Args {
				size, ok := g.expression(arg, depth+1)
				if !ok || size.text > 8192 || g.isScanner(arg) {
					return bound{}, false
				}
			}
			return bound{5, 1}, true
		}
		if len(e.Args) == 1 && ((receiver.Name == "strings" && g.packageName("strings") && selector.Sel.Name == "TrimSpace") || (receiver.Name == "strconv" && g.packageName("strconv") && selector.Sel.Name == "Atoi") || (receiver.Name == "errors" && g.packageName("errors") && selector.Sel.Name == "New")) {
			size, ok := g.expression(e.Args[0], depth+1)
			return bound{size.text, 64}, ok && !g.isScanner(e.Args[0]) && size.text <= 8192
		}
		if value, ok := g.lookup(receiver.Name); ok && value.scanner && len(e.Args) == 0 {
			switch selector.Sel.Name {
			case "Text":
				return bound{4096, 64}, true
			case "Scan":
				return bound{5, 1}, true
			case "Err":
				return bound{4096, 64}, true
			}
		}
		return bound{}, false
	case *ast.CompositeLit:
		if !isSequenceType(e.Type) || len(e.Elts) > 64 {
			return bound{}, false
		}
		for _, el := range e.Elts {
			if _, ok := g.expression(el, depth+1); !ok || g.isScanner(el) {
				return bound{}, false
			}
		}
		return bound{4096, 64}, true
	case *ast.IndexExpr:
		if !g.isSequence(e.X) {
			return bound{}, false
		}
		if _, ok := g.expression(e.X, depth+1); !ok {
			return bound{}, false
		}
		if _, ok := g.expression(e.Index, depth+1); !ok {
			return bound{}, false
		}
		return bound{4096, 64}, true
	case *ast.SliceExpr:
		if e.Slice3 || !g.isSequence(e.X) {
			return bound{}, false
		}
		if _, ok := g.expression(e.X, depth+1); !ok {
			return bound{}, false
		}
		for _, v := range []ast.Expr{e.Low, e.High} {
			if v != nil {
				if _, ok := g.expression(v, depth+1); !ok {
					return bound{}, false
				}
			}
		}
		return bound{4096, 64}, true
	case *ast.ParenExpr:
		return g.expression(e.X, depth+1)
	case *ast.UnaryExpr:
		if e.Op != token.NOT && e.Op != token.ADD && e.Op != token.SUB {
			return bound{}, false
		}
		var ok bool
		size, ok = g.expression(e.X, depth+1)
		if !ok {
			return bound{}, false
		}
		if e.Op == token.NOT {
			size = bound{5, 1}
		}
	case *ast.BinaryExpr:
		left, okLeft := g.expression(e.X, depth+1)
		right, okRight := g.expression(e.Y, depth+1)
		if !okLeft || !okRight {
			return bound{}, false
		}
		switch e.Op {
		case token.ADD:
			size = bound{left.text + right.text, max(left.bits, right.bits) + 1}
		case token.SUB:
			size = bound{64, max(left.bits, right.bits) + 1}
		case token.MUL, token.QUO:
			// Division may multiply a rational's denominator.
			size = bound{64, left.bits + right.bits}
		case token.REM:
			size = bound{64, max(left.bits, right.bits)}
		case token.EQL, token.NEQ, token.LSS, token.LEQ, token.GTR, token.GEQ, token.LAND, token.LOR:
			size = bound{5, 1}
		default:
			return bound{}, false
		}
	default:
		return bound{}, false
	}
	return size, size.text <= 8192 && size.bits <= 256
}

func validName(name *ast.Ident) bool {
	return name != nil && len(name.Name) <= 64
}

func isSequenceType(expr ast.Expr) bool {
	a, ok := expr.(*ast.ArrayType)
	if !ok || a.Len != nil {
		return false
	}
	id, ok := a.Elt.(*ast.Ident)
	return ok && id.Name == "string"
}
func typeName(expr ast.Expr) string {
	if isSequenceType(expr) {
		return "[]string"
	}
	if id, ok := expr.(*ast.Ident); ok {
		return id.Name
	}
	return ""
}
func (g *guard) isSequence(expr ast.Expr) bool {
	switch e := expr.(type) {
	case *ast.Ident:
		v, ok := g.lookup(e.Name)
		return ok && v.sequence
	case *ast.ParenExpr:
		return g.isSequence(e.X)
	case *ast.CompositeLit:
		return isSequenceType(e.Type)
	case *ast.SliceExpr:
		return g.isSequence(e.X)
	case *ast.CallExpr:
		id, ok := e.Fun.(*ast.Ident)
		if !ok {
			return false
		}
		if id.Name == "append" {
			return true
		}
		spec, ok := g.functions[id.Name]
		return ok && spec.result == "[]string"
	}
	return false
}
func validType(expr ast.Expr) bool {
	if expr == nil {
		return true
	}
	if isSequenceType(expr) {
		return true
	}
	name, ok := expr.(*ast.Ident)
	return ok && (name.Name == "int" || name.Name == "string" || name.Name == "bool" || name.Name == "float64" || name.Name == "error")
}

func (g *guard) callResults(call *ast.CallExpr) string {
	if id, ok := call.Fun.(*ast.Ident); ok {
		return g.functions[id.Name].result
	}
	if sel, ok := call.Fun.(*ast.SelectorExpr); ok {
		if pkg, ok := sel.X.(*ast.Ident); ok && pkg.Name == "strconv" && g.packageName("strconv") && sel.Sel.Name == "Atoi" {
			return "int,error"
		}
	}
	return ""
}

func (g *guard) assignment(names []*ast.Ident, values []ast.Expr, constant, declare bool) bool {
	multi := len(names) == 2 && len(values) == 1
	if multi {
		call, ok := values[0].(*ast.CallExpr)
		if !ok || !strings.Contains(g.callResults(call), ",") {
			return false
		}
	}
	if len(names) == 0 || len(names) > 16 || len(values) > 16 || (len(values) != 0 && len(values) != len(names) && !multi) {
		return false
	}
	// Evaluate every RHS before installing any LHS, including scanner aliases.
	bindings := make([]binding, len(names))
	for i, name := range names {
		if !validName(name) {
			return false
		}
		bindings[i].size = bound{64, 64}
		if len(values) != 0 {
			var ok bool
			value := values[0]
			if !multi {
				value = values[i]
			}
			bindings[i].size, ok = g.expression(value, 0)
			if !ok {
				return false
			}
			if !multi {
				bindings[i].scanner = g.isScanner(values[i])
				bindings[i].sequence = g.isSequence(values[i])
			}
		}
		if !constant {
			bindings[i].size.bits = 64
		}
	}
	for i, name := range names {
		if name.Name == "_" {
			continue
		}
		scope := len(g.scopes) - 1
		if !declare {
			for scope > 0 {
				if _, ok := g.scopes[scope][name.Name]; ok {
					break
				}
				scope--
			}
		}
		if _, exists := g.scopes[scope][name.Name]; !exists {
			g.budget.bindings++
			if g.budget.bindings > 128 {
				return false
			}
		}
		g.scopes[scope][name.Name] = bindings[i]
	}
	return true
}

func (g *guard) block(list []ast.Stmt, depth int) bool {
	if depth > 16 {
		return false
	}
	g.scopes = append(g.scopes, make(map[string]binding))
	defer func() { g.scopes = g.scopes[:len(g.scopes)-1] }()
	for _, stmt := range list {
		if !g.statement(stmt, depth) {
			return false
		}
	}
	return true
}

func (g *guard) simple(stmt ast.Stmt, depth int) bool {
	if stmt == nil {
		return true
	}
	switch stmt.(type) {
	case *ast.AssignStmt, *ast.IncDecStmt, *ast.ExprStmt, *ast.EmptyStmt:
		return g.statement(stmt, depth)
	}
	return false
}

func (g *guard) statement(stmt ast.Stmt, depth int) bool {
	g.budget.nodes++
	g.budget.statements++
	if depth > 16 || g.budget.nodes > 1200 || g.budget.statements > 160 {
		return false
	}
	switch s := stmt.(type) {
	case *ast.EmptyStmt:
	case *ast.IncDecStmt:
		name, ok := s.X.(*ast.Ident)
		if !ok || !validName(name) || (s.Tok != token.INC && s.Tok != token.DEC) {
			return false
		}
	case *ast.BranchStmt:
		if g.loopDepth == 0 || s.Label != nil || (s.Tok != token.BREAK && s.Tok != token.CONTINUE) {
			return false
		}
	case *ast.ReturnStmt:
		if g.resultType == "" {
			return len(s.Results) == 0
		}
		if len(s.Results) == 1 && strings.Contains(g.resultType, ",") {
			call, ok := s.Results[0].(*ast.CallExpr)
			if !ok || g.callResults(call) != g.resultType {
				return false
			}
			_, ok = g.expression(call, 0)
			return ok
		}
		if len(s.Results) != len(strings.Split(g.resultType, ",")) {
			return false
		}
		for _, expr := range s.Results {
			if g.isScanner(expr) {
				return false
			}
			if _, ok := g.expression(expr, 0); !ok {
				return false
			}
		}
		return true
	case *ast.BlockStmt:
		if !g.block(s.List, depth+1) {
			return false
		}
	case *ast.DeclStmt:
		decl, ok := s.Decl.(*ast.GenDecl)
		if !ok || (decl.Tok != token.VAR && decl.Tok != token.CONST) || len(decl.Specs) > 32 {
			return false
		}
		for _, spec := range decl.Specs {
			v, ok := spec.(*ast.ValueSpec)
			if !ok || !validType(v.Type) || (decl.Tok == token.CONST && len(v.Values) == 0) ||
				!g.assignment(v.Names, v.Values, decl.Tok == token.CONST, true) {
				return false
			}
			if isSequenceType(v.Type) {
				for _, name := range v.Names {
					if name.Name != "_" {
						scope := g.scopes[len(g.scopes)-1]
						b := scope[name.Name]
						b.sequence = true
						scope[name.Name] = b
					}
				}
			}
		}
	case *ast.AssignStmt:
		if s.Tok != token.DEFINE && s.Tok != token.ASSIGN {
			return false
		}
		if len(s.Lhs) == 1 && len(s.Rhs) == 1 && s.Tok == token.ASSIGN {
			if idx, ok := s.Lhs[0].(*ast.IndexExpr); ok {
				_, named := idx.X.(*ast.Ident)
				if !named || !g.isSequence(idx.X) {
					return false
				}
				if _, ok := g.expression(idx, 0); !ok {
					return false
				}
				_, ok = g.expression(s.Rhs[0], 0)
				return ok
			}
		}
		names := make([]*ast.Ident, len(s.Lhs))
		for i, expr := range s.Lhs {
			var ok bool
			names[i], ok = expr.(*ast.Ident)
			if !ok {
				return false
			}
		}
		if !g.assignment(names, s.Rhs, false, s.Tok == token.DEFINE) {
			return false
		}
	case *ast.ExprStmt:
		call, ok := s.X.(*ast.CallExpr)
		if !ok || call.Ellipsis.IsValid() || len(call.Args) > 16 {
			return false
		}
		if _, ok := call.Fun.(*ast.Ident); ok {
			_, valid := g.userCall(call, 0)
			return valid
		}
		selector, ok := call.Fun.(*ast.SelectorExpr)
		if !ok {
			return false
		}
		pkg, ok := selector.X.(*ast.Ident)
		if !ok {
			return false
		}
		if value, exists := g.lookup(pkg.Name); exists && value.scanner && selector.Sel.Name == "Scan" && len(call.Args) == 0 {
			_, ok := g.expression(call, 0)
			return ok
		}
		if pkg.Name != "fmt" || !g.packageName("fmt") || (selector.Sel.Name != "Print" && selector.Sel.Name != "Println") {
			return false
		}
		g.budget.output++
		for _, arg := range call.Args {
			size, ok := g.expression(arg, 0)
			if !ok || g.isScanner(arg) {
				return false
			}
			g.budget.output += max(size.text, 64) + 1
		}
	case *ast.IfStmt:
		if s.Init != nil {
			return false
		}
		g.scopes = append(g.scopes, make(map[string]binding))
		defer func() { g.scopes = g.scopes[:len(g.scopes)-1] }()
		if !g.simple(s.Init, depth+1) {
			return false
		}
		if _, ok := g.expression(s.Cond, 0); !ok {
			return false
		}
		base := copyScopes(g.scopes)
		merged := copyScopes(base)
		if !g.block(s.Body.List, depth+1) {
			return false
		}
		mergeScopes(merged, g.scopes)
		g.scopes = copyScopes(base)
		if s.Else != nil {
			switch s.Else.(type) {
			case *ast.BlockStmt, *ast.IfStmt:
				if !g.statement(s.Else, depth+1) {
					return false
				}
			default:
				return false
			}
			mergeScopes(merged, g.scopes)
		}
		g.scopes = merged
	case *ast.ForStmt:
		g.scopes = append(g.scopes, make(map[string]binding))
		defer func() { g.scopes = g.scopes[:len(g.scopes)-1] }()
		if s.Init != nil {
			a, ok := s.Init.(*ast.AssignStmt)
			if !ok || a.Tok != token.DEFINE || !g.simple(s.Init, depth+1) {
				return false
			}
		}
		if s.Cond != nil {
			if _, ok := g.expression(s.Cond, 0); !ok {
				return false
			}
		}
		if s.Post != nil {
			switch s.Post.(type) {
			case *ast.AssignStmt, *ast.IncDecStmt:
			default:
				return false
			}
		}
		base := copyScopes(g.scopes)
		g.loopDepth++
		valid := g.block(s.Body.List, depth+1)
		g.loopDepth--
		if !valid || !g.simple(s.Post, depth+1) {
			return false
		}
		mergeScopes(base, g.scopes)
		g.scopes = base
	case *ast.RangeStmt:
		if s.Tok != token.DEFINE || s.Key == nil || !g.isSequence(s.X) {
			return false
		}
		if _, ok := g.expression(s.X, 0); !ok {
			return false
		}
		base := copyScopes(g.scopes)
		g.scopes = append(g.scopes, map[string]binding{})
		for i, expr := range []ast.Expr{s.Key, s.Value} {
			if expr == nil {
				continue
			}
			name, ok := expr.(*ast.Ident)
			if !ok || !validName(name) {
				return false
			}
			if name.Name != "_" {
				size := bound{64, 64}
				if i == 1 {
					size.text = 4096
				}
				g.scopes[len(g.scopes)-1][name.Name] = binding{size: size}
			}
		}
		g.loopDepth++
		valid := g.block(s.Body.List, depth+1)
		g.loopDepth--
		if !valid {
			return false
		}
		g.scopes = g.scopes[:len(g.scopes)-1]
		mergeScopes(base, g.scopes)
		g.scopes = base
	case *ast.SwitchStmt:
		if s.Init != nil {
			return false
		}
		g.scopes = append(g.scopes, make(map[string]binding))
		defer func() { g.scopes = g.scopes[:len(g.scopes)-1] }()
		if !g.simple(s.Init, depth+1) {
			return false
		}
		if s.Tag != nil {
			if _, ok := g.expression(s.Tag, 0); !ok {
				return false
			}
		}
		base := copyScopes(g.scopes)
		merged := copyScopes(base)
		for _, stmt := range s.Body.List {
			clause, ok := stmt.(*ast.CaseClause)
			g.budget.statements++
			if !ok || g.budget.statements > 160 || len(clause.List) > 16 {
				return false
			}
			g.scopes = copyScopes(base)
			for _, expr := range clause.List {
				if _, ok := g.expression(expr, 0); !ok {
					return false
				}
			}
			if !g.block(clause.Body, depth+1) {
				return false
			}
			mergeScopes(merged, g.scopes)
		}
		g.scopes = merged
	default:
		// No arbitrary statements, closures, go/defer, range or fallthrough.
		return false
	}
	return g.budget.nodes <= 1200 && g.budget.output <= outputLimit
}

func validate(code string) (string, string) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, "main.go", code, parser.ParseComments|parser.SkipObjectResolution)
	if err != nil {
		return err.Error(), "compile"
	}
	limit := "Локально доступны main, скалярные функции и функции со срезами []string, len, append, индексы, срезы, for/range, if/switch, fmt, Contains, TrimSpace, Atoi, errors.New, error/nil и Scanner/Err. До 256 записей, 8192 байт на строку, 32768 байт на коллекцию, 4096 вызовов и проходов. Без рекурсии, файлов, сети, глобальных переменных, make/cap, указателей и произвольных импортов."
	if file.Name.Name != "main" {
		return "package must be main", "compile"
	}
	for _, group := range file.Comments {
		for _, comment := range group.List {
			// No compiler, cgo, source-location or other comment directives.
			if strings.HasPrefix(comment.Text, "//go:") || strings.HasPrefix(comment.Text, "//line") || strings.HasPrefix(comment.Text, "/*line") || strings.HasPrefix(comment.Text, "//export") || strings.HasPrefix(comment.Text, "// #cgo") {
				return limit, "limit"
			}
		}
	}
	reserved := false
	ast.Inspect(file, func(n ast.Node) bool {
		if id, ok := n.(*ast.Ident); ok && strings.HasPrefix(id.Name, "__goMiniErrors") {
			reserved = true
		}
		return true
	})
	if reserved {
		return limit, "limit"
	}
	g := guard{budget: &budget{}, functions: map[string]functionSpec{}}
	mains, imports := 0, 0
	declarations := map[string]*ast.FuncDecl{}
	for _, declaration := range file.Decls {
		fn, ok := declaration.(*ast.FuncDecl)
		if !ok {
			continue
		}
		if !validName(fn.Name) || fn.Name.Name == "init" || fn.Name.Name == "append" || fn.Name.Name == "len" || fn.Name.Name == "_" || fn.Recv != nil || fn.Type.TypeParams.NumFields() != 0 || fn.Body == nil || len(fn.Body.List) > 96 || fn.Type.Results.NumFields() > 2 || fn.Type.Params.NumFields() > 4 {
			return limit, "limit"
		}
		if _, duplicate := declarations[fn.Name.Name]; duplicate {
			return "duplicate function declaration", "compile"
		}
		spec := functionSpec{}
		for _, field := range fn.Type.Params.List {
			if !validType(field.Type) || len(field.Names) == 0 {
				return limit, "limit"
			}
			typeName := typeName(field.Type)
			for range field.Names {
				spec.params = append(spec.params, typeName)
			}
		}
		if len(spec.params) > 4 {
			return limit, "limit"
		}
		if fn.Type.Results.NumFields() >= 1 {
			field := fn.Type.Results.List[0]
			if len(field.Names) != 0 || !validType(field.Type) {
				return limit, "limit"
			}
			spec.result = typeName(field.Type)
			if fn.Type.Results.NumFields() == 2 {
				second := fn.Type.Results.List[1]
				if len(second.Names) != 0 || typeName(second.Type) != "error" || (spec.result != "int" && spec.result != "string") {
					return limit, "limit"
				}
				spec.result += ",error"
			}
		}
		if fn.Name.Name == "main" {
			mains++
			if len(spec.params) != 0 || spec.result != "" {
				return limit, "limit"
			}
		}
		declarations[fn.Name.Name] = fn
		g.functions[fn.Name.Name] = spec
	}
	if len(declarations) > 8 {
		return limit, "limit"
	}
	// Reject direct/indirect recursion. A shared runtime budget also bounds
	// an acyclic graph that calls the same helper many times.
	visiting, visited := map[string]bool{}, map[string]bool{}
	var visit func(string, int) bool
	visit = func(name string, depth int) bool {
		if visiting[name] || depth > 8 {
			return false
		}
		if visited[name] {
			return true
		}
		visiting[name] = true
		valid := true
		ast.Inspect(declarations[name].Body, func(node ast.Node) bool {
			call, ok := node.(*ast.CallExpr)
			if !ok {
				return valid
			}
			id, ok := call.Fun.(*ast.Ident)
			if !ok {
				return valid
			}
			if _, exists := declarations[id.Name]; exists && (id.Name == "main" || !visit(id.Name, depth+1)) {
				valid = false
			}
			return valid
		})
		visiting[name] = false
		visited[name] = true
		return valid
	}
	for name := range declarations {
		if !visit(name, 0) {
			return limit, "limit"
		}
	}
	for _, declaration := range file.Decls {
		switch d := declaration.(type) {
		case *ast.GenDecl:
			if d.Tok != token.IMPORT {
				return limit, "limit"
			}
			for _, spec := range d.Specs {
				s, ok := spec.(*ast.ImportSpec)
				if !ok || s.Name != nil || (s.Path.Value != `"fmt"` && s.Path.Value != `"bufio"` && s.Path.Value != `"os"` && s.Path.Value != `"strings"` && s.Path.Value != `"strconv"` && s.Path.Value != `"errors"`) {
					return limit, "limit"
				}
				imports++
			}
		case *ast.FuncDecl:
			g.scopes = []map[string]binding{map[string]binding{}}
			g.resultType = g.functions[d.Name.Name].result
			for _, field := range d.Type.Params.List {
				for _, name := range field.Names {
					if !validName(name) {
						return limit, "limit"
					}
					if name.Name != "_" {
						size := bound{64, 64}
						if typeName(field.Type) == "string" {
							size.text = 4096
						}
						g.scopes[0][name.Name] = binding{size: size, sequence: isSequenceType(field.Type)}
					}
				}
			}
			if !g.block(d.Body.List, 0) {
				return limit, "limit"
			}
		default:
			return limit, "limit"
		}
	}
	if mains != 1 {
		return "function main is undeclared in the main package", "compile"
	}
	if imports > 6 {
		return limit, "limit"
	}
	return "", ""
}

// Instrument only after the authored AST has passed the allowlist. Students
// cannot name these helpers. This remains an educational runner, not a sandbox.
func instrument(code string) (string, error) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, "main.go", code, 0)
	if err != nil {
		return "", err
	}
	call := func(name string, args ...ast.Expr) ast.Stmt {
		return &ast.ExprStmt{X: &ast.CallExpr{Fun: ast.NewIdent(name), Args: args}}
	}
	guards := func(stmt ast.Stmt) []ast.Stmt {
		out := []ast.Stmt{}
		switch x := stmt.(type) {
		case *ast.AssignStmt:
			for _, lhs := range x.Lhs {
				if idx, ok := lhs.(*ast.IndexExpr); ok {
					if id, ok := idx.X.(*ast.Ident); ok {
						out = append(out, call("__goMiniErrorsValue", ast.NewIdent(id.Name)))
					}
				}
				if id, ok := lhs.(*ast.Ident); ok && id.Name != "_" {
					out = append(out, call("__goMiniErrorsValue", ast.NewIdent(id.Name)))
				}
			}
		case *ast.DeclStmt:
			if d, ok := x.Decl.(*ast.GenDecl); ok && d.Tok == token.VAR {
				for _, sp := range d.Specs {
					v := sp.(*ast.ValueSpec)
					for _, id := range v.Names {
						if id.Name != "_" {
							out = append(out, call("__goMiniErrorsValue", ast.NewIdent(id.Name)))
						}
					}
				}
			}
		}
		return out
	}
	var rewrite func([]ast.Stmt) []ast.Stmt
	var walk func(ast.Stmt)
	rewrite = func(list []ast.Stmt) []ast.Stmt {
		out := []ast.Stmt{}
		for _, stmt := range list {
			walk(stmt)
			out = append(out, stmt)
			out = append(out, guards(stmt)...)
		}
		return out
	}
	walk = func(stmt ast.Stmt) {
		switch x := stmt.(type) {
		case *ast.BlockStmt:
			x.List = rewrite(x.List)
		case *ast.IfStmt:
			walk(x.Body)
			if x.Else != nil {
				walk(x.Else)
			}
		case *ast.SwitchStmt:
			for _, item := range x.Body.List {
				c := item.(*ast.CaseClause)
				c.Body = rewrite(c.Body)
			}
		case *ast.RangeStmt:
			walk(x.Body)
			x.Body.List = append([]ast.Stmt{call("__goMiniErrorsTick")}, x.Body.List...)
		case *ast.ForStmt:
			walk(x.Body)
			x.Body.List = append([]ast.Stmt{call("__goMiniErrorsTick")}, x.Body.List...)
			if x.Post != nil {
				body := append([]ast.Stmt{x.Post}, guards(x.Post)...)
				x.Post = &ast.ExprStmt{X: &ast.CallExpr{Fun: &ast.FuncLit{Type: &ast.FuncType{Params: &ast.FieldList{}}, Body: &ast.BlockStmt{List: body}}}}
			}
		}
	}
	for _, decl := range file.Decls {
		if fn, ok := decl.(*ast.FuncDecl); ok && fn.Body != nil {
			fn.Body.List = rewrite(fn.Body.List)
			entry := []ast.Stmt{call("__goMiniErrorsTick")}
			for _, field := range fn.Type.Params.List {
				for _, name := range field.Names {
					if name.Name != "_" {
						entry = append(entry, call("__goMiniErrorsValue", ast.NewIdent(name.Name)))
					}
				}
			}
			fn.Body.List = append(entry, fn.Body.List...)
			if fn.Type.Results.NumFields() >= 1 && (typeName(fn.Type.Results.List[0].Type) == "string" || typeName(fn.Type.Results.List[0].Type) == "[]string") {
				ast.Inspect(fn.Body, func(node ast.Node) bool {
					if r, ok := node.(*ast.ReturnStmt); ok && len(r.Results) == fn.Type.Results.NumFields() {
						expr := r.Results[0]
						helper := "__goMiniErrorsText"
						if isSequenceType(fn.Type.Results.List[0].Type) {
							helper = "__goMiniErrorsList"
						}
						r.Results[0] = &ast.CallExpr{Fun: ast.NewIdent(helper), Args: []ast.Expr{expr}}
					}
					return true
				})
			}
		}
	}
	ast.Inspect(file, func(node ast.Node) bool {
		if c, ok := node.(*ast.CallExpr); ok {
			if id, ok := c.Fun.(*ast.Ident); ok && id.Name == "append" {
				id.Name = "__goMiniErrorsAppend"
			}
		}
		return true
	})
	var buf bytes.Buffer
	if err := format.Node(&buf, fset, file); err != nil {
		return "", err
	}
	buf.WriteString("\nvar __goMiniErrorsBudget int\nfunc __goMiniErrorsTick(){__goMiniErrorsBudget++;if __goMiniErrorsBudget>4096{panic(\"Учебный лимит: больше 4096 вызовов и проходов.\")}}\nfunc __goMiniErrorsValue(v interface{}){\n switch x:=v.(type){\n case string:if len(x)>8192{panic(\"Учебный лимит: строка длиннее 8192 байт.\")}\n case []string:\n  if len(x)>256{panic(\"Учебный лимит: больше 256 записей.\")}\n  total:=0;for _,item:=range x{if len(item)>8192{panic(\"Учебный лимит: слишком длинная запись.\")};total+=len(item)}\n  if total>32768{panic(\"Учебный лимит: данные больше 32768 байт.\")}\n }\n}\nfunc __goMiniErrorsText(s string)string{__goMiniErrorsValue(s);return s}\nfunc __goMiniErrorsList(s []string)[]string{__goMiniErrorsValue(s);return s}\nfunc __goMiniErrorsAppend(s []string,values ...string)[]string{\n if len(s)+len(values)>256{panic(\"Учебный лимит: больше 256 записей.\")}\n __goMiniErrorsValue(s);__goMiniErrorsValue(values)\n total:=0;for _,x:=range s{total+=len(x)};for _,x:=range values{total+=len(x)}\n if total>32768{panic(\"Учебный лимит: данные больше 32768 байт.\")}\n return append(s,values...)\n}\n")
	return buf.String(), nil
}

type limitedBuffer struct {
	buffer bytes.Buffer
	limit  int
}

func (b *limitedBuffer) String() string { return b.buffer.String() }

func (b *limitedBuffer) Write(p []byte) (int, error) {
	remaining := b.limit - b.buffer.Len()
	if len(p) > remaining {
		b.buffer.Write(p[:remaining])
		return remaining, errors.New("output limit exceeded")
	}
	return b.buffer.Write(p)
}

func run(parent context.Context, code string, input string) reply {
	if len(input) > 4096 {
		return result(false, "limit", "", "Вход ограничен 4096 байтами.")
	}
	if len(code) == 0 || len(code) > sourceLimit {
		return result(false, "limit", "", "Код должен содержать от 1 до 12000 байт.")
	}
	if diagnostic, phase := validate(code); diagnostic != "" {
		return result(false, phase, "", diagnostic)
	}
	authored := code
	code, instrumentErr := instrument(code)
	if instrumentErr != nil {
		return result(false, "compile", "", instrumentErr.Error())
	}
	dir, err := os.MkdirTemp("", "go-mini-slices-program-")
	if err != nil {
		return result(false, "server", "", "Не удалось создать временную папку.")
	}
	defer os.RemoveAll(dir)
	if err := os.WriteFile(filepath.Join(dir, "main.go"), []byte(authored), 0600); err != nil {
		return result(false, "server", "", "Не удалось подготовить файл.")
	}
	// Explicit child environments also protect direct invocations of the helper.
	env := []string{"PATH=/usr/bin:/bin", "GO111MODULE=off", "GOPROXY=off", "GOSUMDB=off", "GOTOOLCHAIN=local", "GOENV=off", "CGO_ENABLED=0", "GOMAXPROCS=2", "GOMEMLIMIT=256MiB", "TMPDIR=" + dir}
	for _, key := range []string{"GOCACHE", "GOPATH"} {
		if value := os.Getenv(key); value != "" {
			env = append(env, key+"="+value)
		}
	}
	if os.Getenv("GOCACHE") == "" {
		env = append(env, "GOCACHE="+filepath.Join(dir, "cache"))
	}
	ctx, cancel := context.WithTimeout(parent, 20*time.Second)
	defer cancel()
	build := groupCommand(ctx, "/usr/bin/go", "build", "-o", filepath.Join(dir, "program"), "main.go")
	build.Dir, build.Env = dir, env
	compile := &limitedBuffer{limit: outputLimit}
	build.Stdout, build.Stderr = compile, compile
	if err := build.Run(); err != nil {
		msg := compile.String()
		if ctx.Err() != nil {
			msg = "Сборка заняла слишком много времени. Попробуйте ещё раз."
		} else if msg == "" {
			msg = "Не удалось собрать программу."
		}
		return result(false, "compile", "", msg)
	}
	// Compile the authored program first: inserted guards must not accidentally
	// make an otherwise-unused student variable appear used.
	if err := os.WriteFile(filepath.Join(dir, "main.go"), []byte(code), 0600); err != nil {
		return result(false, "server", "", "Не удалось подготовить ограниченный запуск.")
	}
	guardedBuild := groupCommand(ctx, "/usr/bin/go", "build", "-o", filepath.Join(dir, "program"), "main.go")
	guardedBuild.Dir, guardedBuild.Env = dir, env
	guardedCompile := &limitedBuffer{limit: outputLimit}
	guardedBuild.Stdout, guardedBuild.Stderr = guardedCompile, guardedCompile
	if err := guardedBuild.Run(); err != nil {
		return result(false, "compile", "", guardedCompile.String())
	}
	runCtx, stop := context.WithTimeout(parent, 2*time.Second)
	defer stop()
	command := groupCommand(runCtx, filepath.Join(dir, "program"))
	command.Dir = dir
	command.Stdin = strings.NewReader(input)
	command.Env = []string{"GOMAXPROCS=2", "GOMEMLIMIT=32MiB", "GOTRACEBACK=none"}
	stdout, stderr := &limitedBuffer{limit: outputLimit}, &limitedBuffer{limit: outputLimit}
	command.Stdout, command.Stderr = stdout, stderr
	if err := command.Run(); err != nil {
		msg := stderr.String()
		if runCtx.Err() != nil {
			msg = "Программа превысила время выполнения."
		} else if msg == "" {
			msg = "Программа не завершилась или превысила лимит вывода."
		}
		return result(false, "run", stdout.String(), msg)
	}
	return result(true, "done", stdout.String(), "")
}

// Kill the compiler's entire process group on cancellation, also when this
// helper is invoked directly. The server sends SIGTERM before its hard kill.
func groupCommand(ctx context.Context, executable string, args ...string) *exec.Cmd {
	command := exec.CommandContext(ctx, executable, args...)
	command.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	command.Cancel = func() error {
		err := syscall.Kill(-command.Process.Pid, syscall.SIGKILL)
		if errors.Is(err, syscall.ESRCH) {
			return os.ErrProcessDone
		}
		return err
	}
	command.WaitDelay = time.Second
	return command
}

func main() {
	parent, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	inputBytes, err := io.ReadAll(io.LimitReader(os.Stdin, 20001))
	var input request
	if err != nil || len(inputBytes) > 20000 || json.Unmarshal(inputBytes, &input) != nil {
		json.NewEncoder(os.Stdout).Encode(result(false, "request", "", "Некорректный запрос."))
		return
	}
	if err := json.NewEncoder(os.Stdout).Encode(run(parent, input.Code, input.Input)); err != nil {
		fmt.Fprintln(os.Stderr, "response encoding failed")
	}
}
