# -*- coding: utf-8 -*-
"""打包收尾：清理冗余文件 + 剥离注释。

用法（在项目根目录）：
    python scripts/strip-releases.py                 # 默认处理 dist/win-unpacked/resources
    python scripts/strip-releases.py <resources目录>

已被 npm run build 串联，一般不需要手动执行。
"""
import ast
import io
import os
import re
import shutil
import subprocess
import sys
import tokenize

# 这些文件里的头部是第三方版权声明，删注释等于违反其许可，必须跳过
PRESERVE = {
    "pinyin.js",
    "qrcodebase.js",
    "sample2009.js",   # 名字匹配用，下面按 basename 精确比对
}
PRESERVE_BASENAMES = {"pinyin.js", "qrcodebase.js"}

CLEAN_DIRS = {"__pycache__"}
CLEAN_SUFFIX = {".bak", ".pyc", ".pyo", ".log"}


# ------------------------------------------------------------------ 清理
def clean(root):
    removed = []
    py_root = os.path.abspath(os.path.join(root, "python"))
    for dirpath, dirnames, filenames in os.walk(root):
        # 内置 Python 运行时的缓存保留，删了会让程序首次启动变慢
        if os.path.abspath(dirpath).startswith(py_root):
            dirnames[:] = []
            continue
        for d in list(dirnames):
            if d in CLEAN_DIRS:
                target = os.path.join(dirpath, d)
                try:
                    shutil.rmtree(target)
                    removed.append(target)
                except OSError:
                    pass
                dirnames.remove(d)
        for f in filenames:
            if os.path.splitext(f)[1].lower() in CLEAN_SUFFIX:
                try:
                    os.remove(os.path.join(dirpath, f))
                    removed.append(os.path.join(dirpath, f))
                except OSError:
                    pass
    # 运行期用户数据（配置、日志、个人资料），不该随包分发
    for rel in ("ticketeditor/log", "ticketeditor/path.json",
                "ticketeditor/user_profile.json", "ticketeditor/settings.json"):
        p = os.path.join(root, rel)
        if os.path.isdir(p):
            shutil.rmtree(p, ignore_errors=True)
            removed.append(p)
        elif os.path.isfile(p):
            try:
                os.remove(p)
                removed.append(p)
            except OSError:
                pass
    return removed


# ------------------------------------------------------------------ CSS
def strip_css(text):
    out, i, n = [], 0, len(text)
    while i < n:
        ch = text[i]
        if ch in ('"', "'"):
            q = ch
            out.append(ch)
            i += 1
            while i < n:
                out.append(text[i])
                if text[i] == "\\" and i + 1 < n:
                    out.append(text[i + 1])
                    i += 2
                    continue
                if text[i] == q:
                    i += 1
                    break
                i += 1
            continue
        if ch == "/" and i + 1 < n and text[i + 1] == "*":
            j = text.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        out.append(ch)
        i += 1
    s = "".join(out)
    s = re.sub(r"\n{3,}", "\n\n", s)
    s = re.sub(r"[ \t]+\n", "\n", s)
    return s.strip() + "\n"


# ------------------------------------------------------------------ Python
def strip_py(text):
    doc_lines = set()
    try:
        tree = ast.parse(text)
        for node in ast.walk(tree):
            if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                body = getattr(node, "body", [])
                if body and isinstance(body[0], ast.Expr) \
                        and isinstance(body[0].value, ast.Constant) \
                        and isinstance(body[0].value.value, str):
                    for ln in range(body[0].lineno, (body[0].end_lineno or body[0].lineno) + 1):
                        doc_lines.add(ln)
    except SyntaxError:
        return text, "syntax-error"

    kills = []
    try:
        for tok in tokenize.generate_tokens(io.StringIO(text).readline):
            if tok.type == tokenize.COMMENT:
                kills.append((tok.start[0], tok.start[1], tok.end[1]))
    except (tokenize.TokenError, IndentationError):
        return text, "tokenize-error"

    per_row = {}
    for row, c0, c1 in kills:
        per_row.setdefault(row, []).append((c0, c1))

    out = []
    for idx, line in enumerate(text.splitlines(keepends=True), start=1):
        if idx in doc_lines:
            continue
        if idx in per_row:
            body = line.rstrip("\n")
            nl = "\n" if line.endswith("\n") else ""
            for c0, c1 in sorted(per_row[idx], reverse=True):
                body = body[:c0] + body[c1:]
            out.append(body.rstrip() + nl)
        else:
            out.append(line)

    s = "".join(out)
    s = re.sub(r"\n{4,}", "\n\n\n", s)
    s = re.sub(r"[ \t]+\n", "\n", s)
    return s, ""


# ------------------------------------------------------------------ HTML
SCRIPT_RE = re.compile(r"(<script\b[^>]*>)(.*?)(</script>)", re.S | re.I)
STYLE_RE = re.compile(r"(<style\b[^>]*>)(.*?)(</style>)", re.S | re.I)
HTML_COMMENT_RE = re.compile(r"<!--(?!\[if).*?-->", re.S)


def strip_html(text, js_stripper):
    notes = []

    def do_script(m):
        head, body, tail = m.group(1), m.group(2), m.group(3)
        if not body.strip():
            return m.group(0)
        if re.search(r"</script>", body, re.I):
            notes.append("script 内含 </script> 字面量，跳过")
            return m.group(0)
        new = js_stripper(body)
        if new is None:
            notes.append("内嵌 JS 剥离失败，保留原样")
            return m.group(0)
        return head + "\n" + new.strip("\n") + "\n" + tail

    def do_style(m):
        head, body, tail = m.group(1), m.group(2), m.group(3)
        return (head + "\n" + strip_css(body) + tail) if body.strip() else m.group(0)

    text = SCRIPT_RE.sub(do_script, text)
    text = STYLE_RE.sub(do_style, text)
    text = HTML_COMMENT_RE.sub("", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text, "; ".join(notes)


# ------------------------------------------------------------------ 主流程
def find_node():
    for cand in (os.environ.get("NODE_EXE"), shutil.which("node"), shutil.which("nodejs")):
        if cand and os.path.exists(cand):
            return cand
    return None


def collect(root):
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        # 跳过内置 Python 运行时
        if os.path.abspath(dirpath).startswith(os.path.join(os.path.abspath(root), "python")):
            continue
        for f in filenames:
            base = f.lower()
            if base.endswith(".min.js") or f in PRESERVE_BASENAMES:
                continue
            if os.path.splitext(f)[1].lower() in (".js", ".py", ".css", ".html"):
                files.append(os.path.join(dirpath, f))
    return files


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        "dist", "win-unpacked", "resources")
    if not os.path.isdir(root):
        print("[!] 目录不存在: " + root)
        return 1

    removed = clean(root)
    print("[clean] 移除 %d 项冗余文件" % len(removed))

    files = collect(root)
    js_files = [f for f in files if f.lower().endswith(".js")]
    other = [f for f in files if not f.lower().endswith(".js")]

    node = find_node()
    js_stripper = None
    if js_files:
        if not node:
            print("[!] 找不到 node，JS 注释未处理")
        else:
            script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "strip-js.js")
            r = subprocess.run([node, script] + js_files, capture_output=True, text=True)
            ok = r.stdout.count("\nOK ") + r.stdout.startswith("OK ")
            print("[js] 处理 %d 个文件%s" % (len(js_files), "" if r.returncode == 0 else "（有失败）"))
            if r.returncode != 0:
                print(r.stdout[-800:])
                print(r.stderr[-800:])

            def js_stripper(code):
                import tempfile
                fd, tmp = tempfile.mkstemp(suffix=".js")
                os.close(fd)
                try:
                    with open(tmp, "w", encoding="utf-8") as f:
                        f.write(code)
                    r2 = subprocess.run([node, script, tmp], capture_output=True, text=True)
                    if r2.returncode != 0:
                        return None
                    with open(tmp, "r", encoding="utf-8") as f:
                        return f.read()
                finally:
                    try:
                        os.remove(tmp)
                    except OSError:
                        pass

    total_before = total_after = 0
    for path in other:
        ext = os.path.splitext(path)[1].lower()
        try:
            with open(path, "r", encoding="utf-8", errors="surrogateescape") as f:
                src = f.read()
            before = len(src)
            if ext == ".py":
                out, note = strip_py(src)
            elif ext == ".css":
                out, note = strip_css(src), ""
            elif ext == ".html":
                out, note = strip_html(src, js_stripper) if js_stripper else (src, "无 node，跳过")
            else:
                continue
            with open(path, "w", encoding="utf-8", errors="surrogateescape", newline="\n") as f:
                f.write(out)
            total_before += before
            total_after += len(out)
        except Exception as e:
            print("[!] %s: %s" % (os.path.basename(path), str(e)[:120]))

    print("[done] py/css/html %d 个文件，%d -> %d 字节"
          % (len([f for f in other]), total_before, total_after))
    return 0


if __name__ == "__main__":
    sys.exit(main())
