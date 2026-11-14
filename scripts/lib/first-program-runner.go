// Local-only educational runner. The AST allowlist is the security boundary:
// only literal-string calls to fmt.Print/Println in one main are executable.
// It is intentionally NOT a general-purpose Go sandbox.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type request struct {
	Code string `json:"code"`
}
type reply struct {
	OK         bool   `json:"ok"`
	Phase      string `json:"phase"`
	Stdout     string `json:"stdout"`
	Diagnostic string `json:"diagnostic,omitempty"`
	Line       int    `json:"line,omitempty"`
	Engine     string `json:"engine"`
}

func result(ok bool, phase, output, diagnostic string, line int) reply {
	return reply{ok, phase, output, diagnostic, line, "Go"}
}

func validate(code string) (string, int, string) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, "main.go", code, parser.ParseComments)
	if err != nil {
		return err.Error(), firstLine(err.Error()), "compile"
	}
	limit := func(pos token.Pos) (string, int, string) {
		return "Локальный тренажёр этого урока поддерживает только main и вызовы fmt.Print / fmt.Println со строками. Другие конструкции здесь не запускаются.", fset.Position(pos).Line, "limit"
	}
	if file.Name.Name != "main" {
		return "package must be main", 1, "compile"
	}
	for _, group := range file.Comments {
		for _, c := range group.List {
			if strings.HasPrefix(c.Text, "//go:") || strings.HasPrefix(c.Text, "//line ") {
				return limit(c.Pos())
			}
		}
	}
	mains, imports, outputSize := 0, 0, 0
	for _, decl := range file.Decls {
		switch d := decl.(type) {
		case *ast.GenDecl:
			if d.Tok != token.IMPORT {
				return limit(d.Pos())
			}
			for _, spec := range d.Specs {
				s, ok := spec.(*ast.ImportSpec)
				if !ok || s.Name != nil {
					return limit(spec.Pos())
				}
				name, e := strconv.Unquote(s.Path.Value)
				if e != nil || name != "fmt" {
					return limit(s.Pos())
				}
				imports++
			}
		case *ast.FuncDecl:
			mains++
			if mains > 1 || d.Name.Name != "main" || d.Recv != nil || d.Type.Params.NumFields() != 0 || d.Type.Results.NumFields() != 0 || d.Type.TypeParams.NumFields() != 0 || d.Body == nil {
				return limit(d.Pos())
			}
			if len(d.Body.List) > 96 {
				return limit(d.Pos())
			}
			for _, stmt := range d.Body.List {
				if _, ok := stmt.(*ast.EmptyStmt); ok {
					continue
				}
				expr, ok := stmt.(*ast.ExprStmt)
				if !ok {
					return limit(stmt.Pos())
				}
				call, ok := expr.X.(*ast.CallExpr)
				if !ok || call.Ellipsis.IsValid() {
					return limit(stmt.Pos())
				}
				sel, ok := call.Fun.(*ast.SelectorExpr)
				if !ok {
					return limit(stmt.Pos())
				}
				pkg, ok := sel.X.(*ast.Ident)
				// Misspelled names are safe to compile, and preserve a real Go diagnostic.
				if !ok || pkg.Name != "fmt" || (sel.Sel.Name != "Print" && sel.Sel.Name != "Println" && sel.Sel.Name != "PrintLn" && sel.Sel.Name != "printLn") || len(call.Args) > 16 {
					return limit(stmt.Pos())
				}
				for _, arg := range call.Args {
					lit, ok := arg.(*ast.BasicLit)
					if !ok || lit.Kind != token.STRING {
						return limit(arg.Pos())
					}
					value, e := strconv.Unquote(lit.Value)
					if e != nil {
						return "invalid string literal", fset.Position(lit.Pos()).Line, "compile"
					}
					outputSize += len(value) + 1
				}
			}
		default:
			return limit(decl.Pos())
		}
	}
	if mains != 1 {
		return "function main is undeclared in the main package", 1, "compile"
	}
	if imports > 1 || outputSize > 24000 {
		return limit(file.Pos())
	}
	return "", 0, ""
}

func firstLine(text string) int {
	match := regexp.MustCompile(`main\.go:(\d+)`).FindStringSubmatch(text)
	if len(match) < 2 {
		return 0
	}
	n, _ := strconv.Atoi(match[1])
	return n
}

func run(code string) reply {
	if len(code) == 0 || len(code) > 12000 {
		return result(false, "limit", "", "Код должен содержать от 1 до 12000 байт.", 0)
	}
	if diagnostic, line, phase := validate(code); diagnostic != "" {
		return result(false, phase, "", diagnostic, line)
	}
	dir, err := os.MkdirTemp("", "go-mini-program-")
	if err != nil {
		return result(false, "server", "", "Не удалось создать временную папку.", 0)
	}
	defer os.RemoveAll(dir)
	if err = os.WriteFile(filepath.Join(dir, "main.go"), []byte(code), 0600); err != nil {
		return result(false, "server", "", "Не удалось подготовить файл.", 0)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	build := exec.CommandContext(ctx, "/usr/bin/go", "build", "-o", filepath.Join(dir, "program"), "main.go")
	build.Dir = dir
	var compile bytes.Buffer
	build.Stdout = &compile
	build.Stderr = &compile
	if err = build.Run(); err != nil {
		msg := compile.String()
		if ctx.Err() != nil {
			msg = "Сборка заняла слишком много времени. Попробуйте ещё раз."
		}
		return result(false, "compile", "", msg, firstLine(msg))
	}
	runCtx, stop := context.WithTimeout(context.Background(), 2*time.Second)
	defer stop()
	command := exec.CommandContext(runCtx, filepath.Join(dir, "program"))
	command.Dir = dir
	var stdout, stderr bytes.Buffer
	command.Stdout = &stdout
	command.Stderr = &stderr
	if err = command.Run(); err != nil {
		return result(false, "run", stdout.String(), stderr.String(), 0)
	}
	return result(true, "done", stdout.String(), "", 0)
}

func main() {
	var input request
	if err := json.NewDecoder(io.LimitReader(os.Stdin, 20000)).Decode(&input); err != nil {
		json.NewEncoder(os.Stdout).Encode(result(false, "request", "", "Некорректный запрос.", 0))
		return
	}
	if err := json.NewEncoder(os.Stdout).Encode(run(input.Code)); err != nil {
		fmt.Fprintln(os.Stderr, "response encoding failed")
	}
}
