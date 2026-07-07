import { createFileRoute, Link } from "@tanstack/react-router";
import { EXAMPLES } from "@/examples/_examples";
import { gitConfig } from "@/lib/shared";
import "@/landing/landing.css";

export const Route = createFileRoute("/examples/")({
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
  component: ExamplesGallery,
});

const GITHUB_URL = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

function ExamplesGallery() {
  return (
    <div className="landing min-h-screen">
      {/* top bar */}
      <header className="tsl-hud flex items-center justify-between px-5 py-4 md:px-8">
        <Link to="/" className="tsl-hud-value">
          ▲ three-start
        </Link>
        <nav className="flex gap-5 md:gap-8">
          <Link to="/docs/$" params={{ _splat: "" }}>
            Docs
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
        <div className="pt-10 md:pt-16">
          <div className="tsl-kicker">field notes · one concept each</div>
          <h1
            className="tsl-serif mt-4 text-6xl md:text-8xl"
            style={{ lineHeight: 0.95 }}
          >
            Examples
          </h1>
          <p className="tsl-lead mt-5 max-w-xl">
            Small, focused scenes — each demonstrates a single three-start idea
            in a few dozen lines. Open one, watch it run, hit{" "}
            <code>view code</code>: the whole example is the code you see.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map((ex, i) => (
            <Link
              key={ex.id}
              to="/examples/$example"
              params={{ example: ex.id }}
              className="tsl-card"
            >
              <div className="tsl-window-bar">
                <span className="tsl-window-dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                <span className="tsl-window-title">
                  {String(i + 1).padStart(2, "0")} · {ex.id}.ts
                </span>
                <span className="tsl-window-meta">run ▸</span>
              </div>
              <div className="tsl-card-shot">
                <img
                  src={`/img/examples/${ex.id}.png`}
                  alt={`${ex.title} — live preview`}
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
          ))}
        </div>

        <footer className="tsl-hud mt-20 flex flex-wrap items-center justify-center gap-x-3 text-center">
          <span>every example is a single .ts file</span>
          <span aria-hidden>·</span>
          <a
            href={`${GITHUB_URL}/tree/main/src/examples`}
            target="_blank"
            rel="noreferrer"
          >
            view sources ↗
          </a>
        </footer>
      </main>
    </div>
  );
}
