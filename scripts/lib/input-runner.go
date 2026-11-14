// Local educational runner, not a general-purpose Go sandbox. Only a bounded,
// straight-line main over scalar values and fmt.Print/Println can reach Go.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
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

type guard struct {
	values   map[string]bound
	scanners map[string]bool
	nodes    int
	output   int
}

func (g *guard) expression(expr ast.Expr, depth int) (bound, bool) {
	g.nodes++
	if depth > 24 || g.nodes > 800 {
		return bound{}, false
	}
	var size bound
	switch e := expr.(type) {
	case *ast.Ident:
		if len(e.Name) > 64 {
			return bound{}, false
		}
		if e.Name == "true" || e.Name == "false" {
			return bound{5, 1}, true
		}
		var ok bool
		size, ok = g.values[e.Name]
		if !ok {
			// Unresolved identifiers cannot access anything: all function calls,
			// selectors and types are separately allowlisted. Keep Go's error.
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
		selector, ok := e.Fun.(*ast.SelectorExpr)
		if !ok || e.Ellipsis.IsValid() {
			return bound{}, false
		}
		receiver, ok := selector.X.(*ast.Ident)
		if !ok {
			return bound{}, false
		}
		if receiver.Name == "bufio" && selector.Sel.Name == "NewScanner" && len(e.Args) == 1 {
			source, ok := e.Args[0].(*ast.SelectorExpr)
			if !ok || source.Sel.Name != "Stdin" {
				return bound{}, false
			}
			pkg, ok := source.X.(*ast.Ident)
			return bound{64, 64}, ok && pkg.Name == "os"
		}
		if g.scanners[receiver.Name] && selector.Sel.Name == "Text" && len(e.Args) == 0 {
			return bound{4096, 64}, true
		}
		return bound{}, false
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
		case token.EQL, token.NEQ, token.LSS, token.LEQ, token.GTR, token.GEQ:
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

func validType(expr ast.Expr) bool {
	if expr == nil {
		return true
	}
	name, ok := expr.(*ast.Ident)
	return ok && (name.Name == "int" || name.Name == "string" || name.Name == "bool" || name.Name == "float64")
}

func (g *guard) assignment(names []*ast.Ident, values []ast.Expr, constant bool) bool {
	if len(names) == 0 || len(names) > 16 || len(values) > 16 || (len(values) != 0 && len(values) != len(names)) {
		return false
	}
	// Evaluate all right-hand sides first: a, b = b, a is a real swap.
	sizes := make([]bound, len(names))
	for i, name := range names {
		if !validName(name) {
			return false
		}
		sizes[i] = bound{64, 64}
		if len(values) != 0 {
			var ok bool
			sizes[i], ok = g.expression(values[i], 0)
			if !ok {
				return false
			}
		}
	}
	for i, name := range names {
		if name.Name != "_" {
			// Runtime scalars have fixed width. Only compile-time constants can
			// accumulate huge numerators/denominators across declarations.
			if !constant {
				sizes[i].bits = 64
			}
			g.values[name.Name] = sizes[i]
			g.scanners[name.Name] = false
			if len(values) != 0 {
				if call, ok := values[i].(*ast.CallExpr); ok {
					if sel, ok := call.Fun.(*ast.SelectorExpr); ok && sel.Sel.Name == "NewScanner" {
						g.scanners[name.Name] = true
					}
				}
			}
		}
	}
	return len(g.values) <= 128
}

func validate(code string) (string, string) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, "main.go", code, parser.ParseComments|parser.SkipObjectResolution)
	if err != nil {
		return err.Error(), "compile"
	}
	limit := "Локальный запуск поддерживает одну main, переменные и константы int/string/bool/float64, присваивание, арифметику, сравнения и fmt.Print / fmt.Println. Также доступны bufio.NewScanner(os.Stdin), scanner.Scan() и scanner.Text(). Другие конструкции или слишком большие выражения здесь не запускаются."
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
	g := guard{values: make(map[string]bound), scanners: make(map[string]bool)}
	mains, imports := 0, 0
	for _, declaration := range file.Decls {
		switch d := declaration.(type) {
		case *ast.GenDecl:
			if d.Tok != token.IMPORT {
				return limit, "limit"
			}
			for _, spec := range d.Specs {
				s, ok := spec.(*ast.ImportSpec)
				if !ok || s.Name != nil || (s.Path.Value != `"fmt"` && s.Path.Value != `"bufio"` && s.Path.Value != `"os"`) {
					return limit, "limit"
				}
				imports++
			}
		case *ast.FuncDecl:
			mains++
			if mains > 1 || d.Name.Name != "main" || d.Recv != nil || d.Type.TypeParams.NumFields() != 0 || d.Type.Params.NumFields() != 0 || d.Type.Results.NumFields() != 0 || d.Body == nil || len(d.Body.List) > 96 {
				return limit, "limit"
			}
			for _, statement := range d.Body.List {
				g.nodes++
				switch s := statement.(type) {
				case *ast.EmptyStmt:
					continue
				case *ast.DeclStmt:
					decl, ok := s.Decl.(*ast.GenDecl)
					if !ok || (decl.Tok != token.VAR && decl.Tok != token.CONST) || len(decl.Specs) > 32 {
						return limit, "limit"
					}
					for _, spec := range decl.Specs {
						v, ok := spec.(*ast.ValueSpec)
						if !ok || !validType(v.Type) || (decl.Tok == token.CONST && len(v.Values) == 0) || !g.assignment(v.Names, v.Values, decl.Tok == token.CONST) {
							return limit, "limit"
						}
					}
				case *ast.AssignStmt:
					if s.Tok != token.DEFINE && s.Tok != token.ASSIGN {
						return limit, "limit"
					}
					names := make([]*ast.Ident, len(s.Lhs))
					for i, expr := range s.Lhs {
						var ok bool
						names[i], ok = expr.(*ast.Ident)
						if !ok {
							return limit, "limit"
						}
					}
					if !g.assignment(names, s.Rhs, false) {
						return limit, "limit"
					}
				case *ast.ExprStmt:
					call, ok := s.X.(*ast.CallExpr)
					if !ok || call.Ellipsis.IsValid() || len(call.Args) > 16 {
						return limit, "limit"
					}
					selector, ok := call.Fun.(*ast.SelectorExpr)
					if !ok {
						return limit, "limit"
					}
					pkg, ok := selector.X.(*ast.Ident)
					if ok && g.scanners[pkg.Name] && selector.Sel.Name == "Scan" && len(call.Args) == 0 {
						continue
					}
					if !ok || pkg.Name != "fmt" || (selector.Sel.Name != "Print" && selector.Sel.Name != "Println") {
						return limit, "limit"
					}
					g.output++
					for _, arg := range call.Args {
						size, ok := g.expression(arg, 0)
						if !ok {
							return limit, "limit"
						}
						g.output += max(size.text, 64) + 1
					}
				default:
					return limit, "limit"
				}
				if g.nodes > 800 || g.output > outputLimit {
					return limit, "limit"
				}
			}
		default:
			return limit, "limit"
		}
	}
	if mains != 1 {
		return "function main is undeclared in the main package", "compile"
	}
	if imports > 3 {
		return limit, "limit"
	}
	return "", ""
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

func run(code string, input string) reply {
	if len(input) > 4096 {
		return result(false, "limit", "", "Вход ограничен 4096 байтами.")
	}
	if len(code) == 0 || len(code) > sourceLimit {
		return result(false, "limit", "", "Код должен содержать от 1 до 12000 байт.")
	}
	if diagnostic, phase := validate(code); diagnostic != "" {
		return result(false, phase, "", diagnostic)
	}
	dir, err := os.MkdirTemp("", "go-mini-input-program-")
	if err != nil {
		return result(false, "server", "", "Не удалось создать временную папку.")
	}
	defer os.RemoveAll(dir)
	if err := os.WriteFile(filepath.Join(dir, "main.go"), []byte(code), 0600); err != nil {
		return result(false, "server", "", "Не удалось подготовить файл.")
	}
	// Explicit child environments also protect direct invocations of the helper.
	env := []string{"PATH=/usr/bin:/bin", "GO111MODULE=off", "GOPROXY=off", "GOSUMDB=off", "GOTOOLCHAIN=local", "CGO_ENABLED=0", "GOMAXPROCS=2", "GOMEMLIMIT=256MiB", "TMPDIR=" + dir}
	for _, key := range []string{"GOCACHE", "GOPATH"} {
		if value := os.Getenv(key); value != "" {
			env = append(env, key+"="+value)
		}
	}
	if os.Getenv("GOCACHE") == "" {
		env = append(env, "GOCACHE="+filepath.Join(dir, "cache"))
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	build := exec.CommandContext(ctx, "/usr/bin/go", "build", "-o", filepath.Join(dir, "program"), "main.go")
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
	runCtx, stop := context.WithTimeout(context.Background(), 2*time.Second)
	defer stop()
	command := exec.CommandContext(runCtx, filepath.Join(dir, "program"))
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

func main() {
	inputBytes, err := io.ReadAll(io.LimitReader(os.Stdin, 20001))
	var input request
	if err != nil || len(inputBytes) > 20000 || json.Unmarshal(inputBytes, &input) != nil {
		json.NewEncoder(os.Stdout).Encode(result(false, "request", "", "Некорректный запрос."))
		return
	}
	if err := json.NewEncoder(os.Stdout).Encode(run(input.Code, input.Input)); err != nil {
		fmt.Fprintln(os.Stderr, "response encoding failed")
	}
}
