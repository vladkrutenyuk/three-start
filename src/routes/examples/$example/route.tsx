import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EXAMPLES } from "@/examples/_examples";
import { CodeSource } from "@/landing/CodeWindow";
import "@/landing/landing.css";

export const Route = createFileRoute("/examples/$example")({
  component: ExampleViewer,
});

// Sources import the library barrel via the repo alias; readers should see
// the published package name instead.
const toDisplaySource = (raw: string) =>
  raw.replaceAll('"@/core"', '"three-start"');

function ExampleViewer() {
  const { example } = Route.useParams();
  const navigate = useNavigate();

  const index = EXAMPLES.findIndex((x) => x.id === example);
  const meta = EXAMPLES[index];
  const prev = EXAMPLES[(index - 1 + EXAMPLES.length) % EXAMPLES.length];
  const next = EXAMPLES[(index + 1) % EXAMPLES.length];

  const [codeOpen, setCodeOpen] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // load the source lazily, once per example
  useEffect(() => {
    setSource(null);
    setCodeOpen(false);
    meta?.loadSource().then((m) => setSource(toDisplaySource(m.default)));
  }, [meta]);

  // keyboard: esc closes code, arrows switch examples
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCodeOpen(false);
      if (e.key === "ArrowLeft" && prev)
        navigate({ to: "/examples/$example", params: { example: prev.id } });
      if (e.key === "ArrowRight" && next)
        navigate({ to: "/examples/$example", params: { example: next.id } });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, prev, next]);

  const copySource = () => {
    if (!source) return;
    navigator.clipboard?.writeText(source).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  if (!meta) {
    return (
      <div className="landing fixed inset-0 flex items-center justify-center">
        <div className="tsl-lead">
          Unknown example.{" "}
          <Link to="/examples" className="tsl-hud-value underline">
            Back to the gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="landing fixed inset-0 overflow-hidden">
      {/* live scene (iframe-isolated) */}
      <div className="absolute inset-0">
        <Outlet />
      </div>

      {/* top bar */}
      <header className="tsl-hud pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-4 md:px-8">
        <span className="pointer-events-auto flex items-center gap-3">
          <Link to="/" className="tsl-hud-value">
            ▲ three-start
          </Link>
          <span aria-hidden>/</span>
          <Link to="/examples">examples</Link>
        </span>
        <span className="pointer-events-auto flex items-center gap-2">
          <Link
            to="/examples/$example"
            params={{ example: prev.id }}
            className="tsl-icon-btn"
            title={`← ${prev.title}`}
          >
            ← prev
          </Link>
          <Link
            to="/examples/$example"
            params={{ example: next.id }}
            className="tsl-icon-btn"
            title={`${next.title} →`}
          >
            next →
          </Link>
          <button
            type="button"
            className="tsl-icon-btn"
            style={
              codeOpen
                ? {
                    color: "var(--tsl-green)",
                    borderColor: "var(--tsl-green-soft)",
                  }
                : undefined
            }
            onClick={() => setCodeOpen((v) => !v)}
          >
            {codeOpen ? "close code ✕" : "view code ⌥"}
          </button>
        </span>
      </header>

      {/* info panel */}
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 max-w-md p-5 md:p-8">
        <div className="tsl-kicker">
          EX {String(index + 1).padStart(2, "0")} /{" "}
          {String(EXAMPLES.length).padStart(2, "0")}
        </div>
        <h1 className="tsl-serif mt-2 text-4xl md:text-5xl">{meta.title}</h1>
        <p className="tsl-note mt-3" style={{ fontSize: "0.74rem" }}>
          {meta.tagline}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {meta.concepts.map((c) => (
            <span key={c} className="tsl-chip">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* code slide-over */}
      <aside
        className="tsl-code-panel"
        data-open={codeOpen}
        aria-hidden={!codeOpen}
      >
        <div className="tsl-window-bar" style={{ padding: "0.6rem 0.9rem" }}>
          <span className="tsl-window-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="tsl-window-title">
            src/examples/{meta.id}/index.ts — the whole example
          </span>
          <button type="button" className="tsl-icon-btn" onClick={copySource}>
            {copied ? "copied ✓" : "copy"}
          </button>
          <button
            type="button"
            className="tsl-icon-btn"
            onClick={() => setCodeOpen(false)}
          >
            esc
          </button>
        </div>
        {source ? (
          <CodeSource code={source} />
        ) : (
          <div className="tsl-note p-6">loading source…</div>
        )}
      </aside>
    </div>
  );
}
