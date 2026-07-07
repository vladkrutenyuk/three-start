import type { ReactNode } from "react";

// Terminal-styled code window with a tiny hand-rolled TS tokenizer.
// Token colours match shiki's `github-dark` so landing code feels
// consistent with the docs.

export interface CodeLine {
  t: string;
  /** cmd = shell prompt line, ok = ✓ output line, out = dim output, code (default) */
  k?: "cmd" | "ok" | "out" | "code";
  /** highlight the whole line */
  hl?: boolean;
}

const KEYWORDS = new Set([
  "import",
  "from",
  "export",
  "const",
  "let",
  "new",
  "class",
  "extends",
  "return",
  "this",
  "declare",
  "module",
  "interface",
  "function",
  "if",
  "else",
  "true",
  "false",
  "null",
  "undefined",
  "private",
  "readonly",
]);

const TOKEN_RE =
  /(\/\/.*$)|("[^"]*"|'[^']*'|`[^`]*`)|([A-Za-z_$][\w$]*)|(\d+(?:\.\d+)?)|(\s+)|(.)/g;

function tokenizeLine(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null = null;
  let key = 0;
  TOKEN_RE.lastIndex = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: classic exec loop
  while ((m = TOKEN_RE.exec(line)) !== null) {
    const [full, comment, str, ident, num] = m;
    let cls: string | undefined;
    if (comment) cls = "tk-cm";
    else if (str) cls = "tk-s";
    else if (num) cls = "tk-n";
    else if (ident) {
      if (KEYWORDS.has(ident)) cls = "tk-k";
      else if (/^[A-Z]/.test(ident)) cls = "tk-c";
      else if (line[TOKEN_RE.lastIndex] === "(") cls = "tk-f";
    }
    out.push(
      cls ? (
        <span key={key++} className={cls}>
          {full}
        </span>
      ) : (
        full
      ),
    );
  }
  return out;
}

function renderLine(line: CodeLine): ReactNode {
  switch (line.k) {
    case "cmd":
      return <span className="tk-cmd">{line.t}</span>;
    case "ok":
      return <span className="tk-ok">{line.t}</span>;
    case "out":
      return <span className="tk-out">{line.t}</span>;
    default:
      return tokenizeLine(line.t);
  }
}

export function CodeWindow({
  title,
  lines,
  cursor,
}: {
  title: string;
  lines: CodeLine[];
  cursor?: boolean;
}) {
  let lineNo = 0;
  return (
    <div className="tsl-window" data-window>
      <div className="tsl-window-bar">
        <span className="tsl-window-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="tsl-window-title">{title}</span>
        <span className="tsl-window-meta">
          utf-8&nbsp;·&nbsp;{lines.length}&nbsp;lines
        </span>
      </div>
      <pre className="tsl-window-body">
        {lines.map((line, i) => {
          const isCode = !line.k || line.k === "code";
          const n = isCode && line.t !== "" ? ++lineNo : null;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static list
              key={i}
              data-line
              className={`tsl-line${line.hl ? " tsl-line-hl" : ""}`}
            >
              <span className="tsl-gutter">{n ?? ""}</span>
              <span className="tsl-line-text">
                {renderLine(line)}
                {line.t === "" ? " " : null}
              </span>
            </div>
          );
        })}
        {cursor && (
          <div data-line className="tsl-line">
            <span className="tsl-gutter" />
            <span className="tsl-line-text">
              <span className="tk-cmd tsl-cursor">&gt; </span>
            </span>
          </div>
        )}
      </pre>
    </div>
  );
}
