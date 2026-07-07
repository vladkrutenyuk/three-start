import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { EXAMPLES, type ExampleItem } from "@/examples/_examples";
import { CodeSource } from "@/landing/CodeWindow";
import { gitConfig } from "@/lib/shared";
import "@/landing/landing.css";

export const Route = createFileRoute("/examples/$example")({
  head: () => ({
    meta: [
      { title: "Examples — Three Start" },
      {
        name: "description",
        content:
          "Small, focused three-start examples — one concept each: components, lifecycle, modules, setActive, timescale.",
      },
    ],
  }),
  component: ExampleViewer,
});

const GITHUB_URL = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

// Sources import the library barrel via the repo alias; readers should see
// the published package name instead.
const toDisplaySource = (raw: string) =>
  raw.replaceAll('"@/core"', '"three-start"');

function Tile({
  ex,
  index,
  active,
  onPick,
}: {
  ex: ExampleItem;
  index: number;
  active: boolean;
  onPick?: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  // keep the active tile in view when navigating via keyboard / prev-next
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <Link
      ref={ref}
      to="/examples/$example"
      params={{ example: ex.id }}
      className="tsl-card"
      data-active={active}
      onClick={onPick}
    >
      <div className="tsl-window-bar">
        <span className="tsl-window-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="tsl-window-title">
          {String(index + 1).padStart(2, "0")} · {ex.id}.ts
        </span>
        <span
          className="tsl-window-meta"
          style={active ? { color: "var(--tsl-green)", opacity: 1 } : undefined}
        >
          {active ? "live ●" : "run ▸"}
        </span>
      </div>
      <div className="tsl-card-shot">
        <img
          src={`/img/examples/${ex.id}.png`}
          alt={`${ex.title} — preview`}
          loading="lazy"
        />
      </div>
      <div className="tsl-card-body">
        <div className="tsl-card-title">{ex.title}</div>
        <p className="tsl-card-tagline">{ex.tagline}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ex.concepts.map((c) => (
            <span key={c} className="tsl-chip">
              {c}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function TileList({ active, onPick }: { active: string; onPick?: () => void }) {
  return (
    <>
      <div className="flex flex-col gap-4 p-4">
        {EXAMPLES.map((ex, i) => (
          <Tile
            key={ex.id}
            ex={ex}
            index={i}
            active={ex.id === active}
            onPick={onPick}
          />
        ))}
      </div>
      <footer className="tsl-hud flex flex-wrap items-center gap-x-2 px-4 pb-5">
        <span>single-file scenes</span>
        <span aria-hidden>·</span>
        <a
          href={`${GITHUB_URL}/tree/main/src/examples`}
          target="_blank"
          rel="noreferrer"
        >
          sources ↗
        </a>
      </footer>
    </>
  );
}

function ExampleViewer() {
  const { example } = Route.useParams();
  const navigate = useNavigate();

  const index = EXAMPLES.findIndex((x) => x.id === example);
  const meta = EXAMPLES[index];
  const prev = EXAMPLES[(index - 1 + EXAMPLES.length) % EXAMPLES.length];
  const next = EXAMPLES[(index + 1) % EXAMPLES.length];

  const [codeOpen, setCodeOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // load the source lazily, once per example
  useEffect(() => {
    setSource(null);
    setCodeOpen(false);
    setNavOpen(false);
    meta?.loadSource().then((m) => setSource(toDisplaySource(m.default)));
  }, [meta]);

  // keyboard: esc closes panels, arrows switch examples
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCodeOpen(false);
        setNavOpen(false);
      }
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
            Back to examples
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="landing fixed inset-0 flex overflow-hidden">
      {/* left rail: tiles (desktop) */}
      <aside className="tsl-side hidden w-[320px] shrink-0 flex-col overflow-y-auto md:flex">
        <div className="sticky top-0 z-10 border-b border-[var(--tsl-border)] bg-[#070907]/92 px-4 pt-4 pb-3 backdrop-blur">
          <div className="tsl-hud flex items-center justify-between">
            <Link to="/" className="tsl-hud-value">
              ▲ three-start
            </Link>
            <nav className="flex gap-4">
              <Link to="/docs/$" params={{ _splat: "" }}>
                Docs
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </nav>
          </div>
          <h1 className="tsl-serif mt-3 text-4xl">Examples</h1>
          <p className="tsl-note mt-1">one concept each · a few dozen lines</p>
        </div>
        <TileList active={meta.id} />
      </aside>

      {/* mobile drawer with the same tiles */}
      {navOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close examples list"
            className="absolute inset-0 bg-black/60"
            onClick={() => setNavOpen(false)}
          />
          <aside className="tsl-side absolute top-0 bottom-0 left-0 flex w-[320px] max-w-[88vw] flex-col overflow-y-auto">
            <div className="tsl-hud flex items-center justify-between border-b border-[var(--tsl-border)] px-4 py-4">
              <span className="tsl-hud-value">▲ examples</span>
              <button
                type="button"
                className="tsl-icon-btn"
                onClick={() => setNavOpen(false)}
              >
                esc
              </button>
            </div>
            <TileList active={meta.id} onPick={() => setNavOpen(false)} />
          </aside>
        </div>
      )}

      {/* main: live scene + chrome */}
      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-0">
          <Outlet />
        </div>

        {/* top bar */}
        <header className="tsl-hud pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-4 md:px-6">
          <span className="pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              className="tsl-icon-btn md:hidden"
              onClick={() => setNavOpen(true)}
            >
              ☰ examples
            </button>
            <span className="hidden md:inline">
              src/examples/{meta.id}/index.ts
            </span>
          </span>
          <span className="pointer-events-auto flex items-center gap-2">
            <Link
              to="/examples/$example"
              params={{ example: prev.id }}
              className="tsl-icon-btn"
              title={`← ${prev.title}`}
            >
              ←
            </Link>
            <Link
              to="/examples/$example"
              params={{ example: next.id }}
              className="tsl-icon-btn"
              title={`${next.title} →`}
            >
              →
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
              {codeOpen ? "close code ✕" : "view code"}
            </button>
          </span>
        </header>

        {/* info */}
        <div className="pointer-events-none absolute bottom-0 left-0 z-10 max-w-md p-5 md:p-6">
          <div className="tsl-kicker">
            EX {String(index + 1).padStart(2, "0")} /{" "}
            {String(EXAMPLES.length).padStart(2, "0")}
          </div>
          <h2 className="tsl-serif mt-2 text-4xl md:text-5xl">{meta.title}</h2>
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

        {/* code slide-over (within the main pane) */}
        <aside
          className="tsl-code-panel"
          style={{ position: "absolute" }}
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
    </div>
  );
}
