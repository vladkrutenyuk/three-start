"use client";

import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  gitConfig,
  kvyverseUrl as KVYVERSE_URL,
  authorXUrl as X_URL,
} from "@/lib/shared";
import { type CodeLine, CodeWindow } from "./CodeWindow";
import { createLandingScene, type LandingSceneApi } from "./scene";
import "./landing.css";

// ---------- story content ----------

interface Chapter {
  kicker: string;
  heading: string;
  lead: React.ReactNode;
  note?: React.ReactNode;
  codeTitle: string;
  code: CodeLine[];
  cursor?: boolean;
  side: "left" | "right";
  extra?: "lifecycle-log" | "active-status";
}

const CHAPTERS: Chapter[] = [
  {
    kicker: "CH 01 · Base camp",
    heading: "Every ascent starts at base camp.",
    lead: (
      <>
        Renderer, scene, camera, render loop, timer, resize handling — the same
        dozens of lines open every Three.js project. <code>three-start</code>{" "}
        ships them wired. One constructor, one <code>mount()</code>, one{" "}
        <code>start()</code>.
      </>
    ),
    note: (
      <>
        A thin layer around Three.js — not a replacement for it.{" "}
        <code>starter.ctx</code> hands you the plain <code>THREE.Scene</code>,{" "}
        <code>PerspectiveCamera</code> and renderer you already know.
      </>
    ),
    codeTitle: "base-camp — zsh",
    cursor: true,
    side: "left",
    code: [
      { t: "$ npm i three-start", k: "cmd" },
      { t: "✓ installed — three & eventemitter3 as peers", k: "ok" },
      { t: "" },
      { t: 'import { ThreeStart } from "three-start";' },
      { t: "" },
      { t: "const starter = new ThreeStart();", hl: true },
      { t: "  ✓ renderer · scene · camera", k: "ok" },
      { t: "  ✓ render loop · timer · resize", k: "ok" },
      { t: "" },
      { t: 'starter.mount(document.getElementById("app")!);' },
      { t: "starter.start();", hl: true },
    ],
  },
  {
    kicker: "CH 02 · Components",
    heading: "Behaviour that lives on the object.",
    lead: (
      <>
        A component is a class extending <code>Object3DBehaviour</code>. Add it
        to any <code>Object3D</code> with <code>addComponent</code> — it wires
        itself into the render loop and the lifecycle. No central{" "}
        <code>animate()</code> dump, no manual update lists.
      </>
    ),
    note: (
      <>
        The satellites circling the peak right now were added exactly like this.
      </>
    ),
    codeTitle: "Orbit.ts",
    side: "right",
    code: [
      { t: "class Orbit extends Object3DBehaviour {" },
      { t: "  speed = 0.55;" },
      { t: "" },
      { t: "  onUpdate() {" },
      { t: "    const dt = this.ctx.getDeltaTime();" },
      { t: "    this.object.rotation.y += this.speed * dt;" },
      { t: "  }" },
      { t: "}" },
      { t: "" },
      { t: "addComponent(satellites, Orbit);", hl: true },
      { t: "// that's it — they're in orbit above the peak" },
    ],
  },
  {
    kicker: "CH 03 · Lifecycle",
    heading: "Awake. Enable. Update. Destroy.",
    lead: (
      <>
        Every component moves through the same event methods:{" "}
        <code>onAwake</code> once, <code>onEnable</code> /{" "}
        <code>onDisable</code> as it switches on and off, <code>onUpdate</code>{" "}
        every frame on the render loop, <code>onDestroy</code> at the end. The
        beacon on the ridge is logging its own lifecycle live — keep scrolling
        to disable and re-enable it.
      </>
    ),
    note: (
      <>
        Render-loop subscriptions are created only for the methods you override
        — an empty component pays nothing for dispatch.
      </>
    ),
    codeTitle: "Beacon.ts",
    side: "left",
    extra: "lifecycle-log",
    code: [
      { t: "class Beacon extends Object3DBehaviour {" },
      { t: "  onAwake()   { /* once — right after addComponent */ }" },
      { t: "  onEnable()  { /* switched on */ }" },
      { t: "  onStart()   { /* once — on first activation */ }" },
      { t: "  onUpdate()  { this.pulse(this.ctx.getTime()); }", hl: true },
      { t: "  onDisable() { /* paused — off the render loop */ }" },
      { t: "  onDestroy() { /* gone for good */ }" },
      { t: "}" },
    ],
  },
  {
    kicker: "CH 04 · Modules",
    heading: "One context. Global systems.",
    lead: (
      <>
        Input, physics, assets, weather — global systems extend{" "}
        <code>ContextModule</code> and register before <code>start()</code>. Any
        component, anywhere in the scene graph, reads them via{" "}
        <code>this.modules</code>. The storm rolling in right now is a{" "}
        <code>WindModule</code> — and every snowflake is reading it.
      </>
    ),
    codeTitle: "WindModule.ts",
    side: "right",
    code: [
      { t: "class WindModule extends ContextModule {" },
      { t: "  strength = 1;" },
      { t: "  direction = new THREE.Vector3(1, 0, 0.35);" },
      { t: "}" },
      { t: "" },
      { t: "const starter = new ThreeStart()" },
      { t: "  .addModules({ wind: new WindModule() });", hl: true },
      { t: "" },
      { t: "class Snowfall extends Object3DBehaviour {" },
      { t: "  onUpdate() {" },
      { t: "    const { direction, strength } = this.modules.wind;", hl: true },
      { t: "    this.drift(direction, strength);" },
      { t: "  }" },
      { t: "}" },
    ],
  },
  {
    kicker: "CH 05 · Control",
    heading: "Pause a whole world with one call.",
    lead: (
      <>
        <code>setActive(obj, false)</code> deactivates an object and its entire
        subtree — every component on it fires <code>onDisable</code>. No
        per-system pause plumbing, no references threaded through your code. The
        same call brings everything back. Watch the expedition around the peak:
      </>
    ),
    codeTitle: "control.ts",
    side: "left",
    extra: "active-status",
    code: [
      { t: "setActive(expedition, false);", hl: true },
      { t: "// every component in the subtree fires onDisable:" },
      { t: "// orbits stop, the beacon goes dark" },
      { t: "" },
      { t: "setActive(expedition, true);", hl: true },
      { t: "// …and picks up right where it left off" },
    ],
  },
  {
    kicker: "CH 06 · Summit",
    heading: "The summit is where your project starts.",
    lead: (
      <>
        Bootstrap, components, modules, lifecycle, control — that&apos;s the
        whole model. Everything on this mountain runs on three-start: the camera
        rig, the traveler, the storm, this very page.
      </>
    ),
    note: <>Scroll on — the route down is shorter than the route up.</>,
    codeTitle: "summit.ts",
    side: "right",
    code: [
      { t: "// you are here" },
      { t: "traveler.position.copy(route.getPointAt(1));", hl: true },
      { t: "" },
      { t: "// everything above was:" },
      { t: "new ThreeStart()          // bootstrap" },
      { t: "Object3DBehaviour         // components" },
      { t: "onAwake … onDestroy       // lifecycle" },
      { t: "ContextModule             // global systems" },
      { t: "setActive / destroy       // control" },
    ],
  },
];

const SECTION_LABELS = [
  "00 · The approach",
  "01 · Base camp",
  "02 · Components",
  "03 · Lifecycle",
  "04 · Modules",
  "05 · Control",
  "06 · Summit",
  "—— · New route",
];

const GITHUB_URL = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;
const TITLE = "Three Start";

// ---------- page ----------

export function LandingPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const elevRef = useRef<HTMLSpanElement>(null);
  const chapterRef = useRef<HTMLSpanElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let disposed = false;
    let api: LandingSceneApi | null = null;
    const anims: { cancel?: () => void }[] = [];
    const cleanups: (() => void)[] = [];

    (async () => {
      // animejs touches the DOM on import — load it client-side only
      const { animate, stagger } = await import("animejs");
      const el = mountRef.current;
      if (disposed || !el) return;

      api = createLandingScene(el);

      // live lifecycle log (ch. 03)
      api.onLifecycleLog = (line) => {
        const logEl = logRef.current;
        if (!logEl) return;
        const t = (performance.now() / 1000).toFixed(1).padStart(6, "0");
        const row = document.createElement("div");
        row.textContent = `[${t}] ${line}`;
        logEl.appendChild(row);
        while (logEl.childNodes.length > 7) {
          const first = logEl.firstChild;
          if (!first) break;
          logEl.removeChild(first);
        }
      };

      // live getIsActive readout (ch. 05)
      api.onActiveChange = (isActive) => {
        const s = statusRef.current;
        if (!s) return;
        s.textContent = String(isActive);
        s.style.color = isActive ? "var(--tsl-green)" : "#f0b429";
      };

      const showPanel = (index: number, first: boolean) => {
        const root = sectionRefs.current[index];
        const panel = root?.querySelector<HTMLElement>("[data-panel]");
        if (!panel) return;
        anims.push(
          animate(panel, { opacity: [0, 1], duration: 450, ease: "outQuad" }),
          animate(panel.querySelectorAll("[data-reveal]"), {
            opacity: [0, 1],
            translateY: [26, 0],
            delay: stagger(85, { start: first ? 350 : 60 }),
            duration: 750,
            ease: "outQuint",
          }),
        );
        const lines = panel.querySelectorAll("[data-line]");
        if (lines.length > 0) {
          anims.push(
            animate(lines, {
              opacity: [0, 1],
              translateX: [-8, 0],
              delay: stagger(26, { start: first ? 600 : 300 }),
              duration: 320,
              ease: "outQuad",
            }),
          );
        }
      };

      const hidePanel = (index: number) => {
        const root = sectionRefs.current[index];
        const panel = root?.querySelector<HTMLElement>("[data-panel]");
        if (!panel) return;
        anims.push(
          animate(panel, { opacity: 0, duration: 220, ease: "outQuad" }),
        );
      };

      // hero intro
      anims.push(
        animate(".tsl-letter", {
          opacity: [0, 1],
          translateY: ["0.55em", "0em"],
          delay: stagger(42, { start: 250 }),
          duration: 950,
          ease: "outExpo",
        }),
      );
      if (hintRef.current) {
        anims.push(
          animate(hintRef.current, {
            translateY: [0, 7],
            alternate: true,
            loop: true,
            duration: 950,
            ease: "inOutSine",
          }),
        );
      }

      // scroll → story position
      let lastIdx = -1;
      const update = () => {
        if (!api) return;
        const sections = sectionRefs.current;
        const mid = window.scrollY + window.innerHeight * 0.55;
        let idx = 0;
        let local = 0;
        for (let i = 0; i < sections.length; i++) {
          const s = sections[i];
          if (!s) continue;
          if (mid >= s.offsetTop) {
            idx = i;
            local = (mid - s.offsetTop) / s.offsetHeight;
          }
        }
        local = Math.min(Math.max(local, 0), 1);
        api.setScroll(idx + local);
        api.setSectionLocal(idx, local);

        if (idx !== lastIdx) {
          if (lastIdx >= 0) hidePanel(lastIdx);
          api.enterSection(idx);
          showPanel(idx, lastIdx === -1);
          lastIdx = idx;
          if (chapterRef.current)
            chapterRef.current.textContent = SECTION_LABELS[idx] ?? "";
        }

        if (elevRef.current) {
          const t = Math.min(Math.max((idx + local - 0.5) / 5.5, 0), 1);
          elevRef.current.textContent = String(Math.round(t * 3090)).padStart(
            4,
            "0",
          );
        }
      };

      const onPointer = (e: PointerEvent) => {
        api?.setPointer(
          (e.clientX / window.innerWidth) * 2 - 1,
          (e.clientY / window.innerHeight) * 2 - 1,
        );
      };

      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      window.addEventListener("pointermove", onPointer, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("scroll", update);
        window.removeEventListener("resize", update);
        window.removeEventListener("pointermove", onPointer);
      });
      update();
    })();

    return () => {
      disposed = true;
      for (const fn of cleanups) fn();
      for (const a of anims) a.cancel?.();
      api?.dispose();
    };
  }, []);

  const copyInstall = () => {
    navigator.clipboard?.writeText("npm i three-start").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className="landing relative min-h-screen">
      {/* three-start scene */}
      <div ref={mountRef} className="fixed inset-0 z-0" />

      {/* CRT overlay */}
      <div className="tsl-crt" aria-hidden />

      {/* HUD: top bar */}
      <header className="tsl-hud fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-4 md:px-8">
        <span>
          <span className="tsl-hud-value">▲ three-start</span>
          <span className="hidden sm:inline">
            &nbsp;— the missing foundation
          </span>
        </span>
        <nav className="flex gap-5 md:gap-8">
          <Link to="/docs/$" params={{ _splat: "" }}>
            Docs
          </Link>
          <Link to="/examples">Examples</Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a
            href={X_URL}
            target="_blank"
            rel="noreferrer"
            title="@vladkrutenyuk on X"
          >
            X
          </a>
        </nav>
      </header>

      {/* HUD: bottom telemetry */}
      <div className="tsl-hud fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-4 md:px-8">
        <span>
          ELEV{" "}
          <span className="tsl-hud-value" ref={elevRef}>
            0000
          </span>{" "}
          M
        </span>
        <span ref={chapterRef}>00 · The approach</span>
      </div>

      {/* story */}
      <div className="relative z-10">
        {/* hero */}
        <section
          ref={(node) => {
            sectionRefs.current[0] = node;
          }}
          className="relative"
          style={{ height: "150vh" }}
        >
          <div className="sticky top-0 flex h-screen flex-col items-center justify-start px-4 pt-[10vh] text-center md:pt-[11vh]">
            <div
              data-panel
              className="tsl-panel flex w-full flex-col items-center"
            >
              <h1 className="tsl-title" aria-label={TITLE}>
                {TITLE.split("").map((ch, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: static string
                    key={i}
                    className="tsl-letter"
                  >
                    {ch === " " ? " " : ch}
                  </span>
                ))}
              </h1>
              <div data-reveal className="tsl-rule mt-6 w-full max-w-2xl" />
              <p
                data-reveal
                className="mt-5 max-w-2xl text-lg font-light font-sans scale-x-90 opacity-80 md:text-3xl"
                style={{
                  color: "#f2f0ea",
                }}
              >
                The missing foundation for Three.js apps
              </p>
              <p
                data-reveal
                className="tsl-hero-note mt-3 max-w-xl text-base scale-x-90"
              >
                bootstrap / lifecycle / a unified component model —<br />a thin
                layer around Three.js, not a replacement for it
              </p>
              <button
                type="button"
                data-reveal
                onClick={copyInstall}
                className="tsl-copy tsl-pill mt-7 px-4 py-2 text-xs tracking-[0.18em] select-none"
                title="copy"
              >
                $ npm i three-start{copied ? "  ✓" : ""}
              </button>
              {/* <div
								data-reveal
								className="mt-6 flex flex-wrap justify-center gap-3 md:gap-4"
							>
								<Link
									to="/docs/$"
									params={{ _splat: "" }}
									className="tsl-btn tsl-btn-primary"
								>
									Read the docs
								</Link>
								<Link to="/examples" className="tsl-btn">
									Examples
								</Link>
								<a
									href={GITHUB_URL}
									target="_blank"
									rel="noreferrer"
									className="tsl-btn"
								>
									GitHub ↗
								</a>
							</div> */}
            </div>
            <div
              ref={hintRef}
              className="tsl-hud absolute bottom-16 left-1/2 -translate-x-1/2"
            >
              scroll to begin the ascent ▾
            </div>
          </div>
        </section>

        {/* chapters */}
        {CHAPTERS.map((ch, i) => (
          <section
            key={ch.kicker}
            ref={(node) => {
              sectionRefs.current[i + 1] = node;
            }}
            className="relative"
            style={{ height: "175vh" }}
          >
            <div className="sticky top-0 flex min-h-screen items-center px-5 md:px-14 lg:px-24">
              <div
                data-panel
                className={`tsl-panel w-full max-w-xl ${
                  ch.side === "right" ? "md:ml-auto" : ""
                }`}
              >
                <div data-reveal className="tsl-kicker">
                  {ch.kicker}
                </div>
                <h2 data-reveal className="tsl-heading mt-4">
                  {ch.heading}
                </h2>
                <p data-reveal className="tsl-lead mt-5">
                  {ch.lead}
                </p>
                <div data-reveal className="mt-6">
                  <CodeWindow
                    title={ch.codeTitle}
                    lines={ch.code}
                    cursor={ch.cursor}
                  />
                </div>
                {ch.extra === "lifecycle-log" && (
                  <div data-reveal className="tsl-window mt-4">
                    <div className="tsl-window-bar">
                      <span className="tsl-window-dots" aria-hidden>
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="tsl-window-title">
                        lifecycle — live from the beacon
                      </span>
                    </div>
                    <div
                      ref={logRef}
                      className="tsl-window-body min-h-[7.5em] text-[0.68rem] leading-relaxed text-[var(--tsl-green)]"
                    />
                  </div>
                )}
                {ch.extra === "active-status" && (
                  <div
                    data-reveal
                    className="tsl-window mt-4 px-4 py-3 text-[0.74rem]"
                  >
                    <span className="tk-cm">{"// live: "}</span>
                    <span className="tk-f">getIsActive</span>
                    (expedition) →{" "}
                    <span ref={statusRef} style={{ color: "var(--tsl-green)" }}>
                      true
                    </span>
                    <span className="tsl-cursor" />
                  </div>
                )}
                {ch.note && (
                  <p data-reveal className="tsl-note mt-5">
                    {ch.note}
                  </p>
                )}
              </div>
            </div>
          </section>
        ))}

        {/* outro */}
        <section
          ref={(node) => {
            sectionRefs.current[CHAPTERS.length + 1] = node;
          }}
          className="relative flex min-h-screen flex-col"
        >
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <div
              data-panel
              className="tsl-panel flex w-full flex-col items-center"
            >
              <div data-reveal className="tsl-kicker">
                No more boilerplate ahead
              </div>
              <h2
                data-reveal
                className="tsl-serif mt-6 text-5xl leading-none md:text-7xl"
                style={{ textShadow: "0 0 40px rgba(230,228,220,0.25)" }}
              >
                Start your ascent.
              </h2>
              <button
                type="button"
                data-reveal
                onClick={copyInstall}
                className="tsl-copy tsl-pill mt-10 px-5 py-2.5 text-sm tracking-[0.18em]"
                title="copy"
              >
                $ npm i three-start{copied ? "  ✓" : ""}
              </button>
              <div
                data-reveal
                className="mt-8 flex flex-wrap justify-center gap-4"
              >
                <Link
                  to="/docs/$"
                  params={{ _splat: "" }}
                  className="tsl-btn tsl-btn-primary"
                >
                  Read the docs
                </Link>
                <Link to="/examples" className="tsl-btn">
                  Examples
                </Link>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="tsl-btn"
                >
                  GitHub ↗
                </a>
              </div>
              <p data-reveal className="tsl-note mt-10">
                <span
                  className="tsl-kicker"
                  style={{ letterSpacing: "0.22em" }}
                >
                  in the field
                </span>
                <br />
                three-start is the scripting foundation of{" "}
                <a
                  href={KVYVERSE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="tsl-hud-value underline decoration-[var(--tsl-green-soft)] underline-offset-4 hover:text-[var(--tsl-green)]"
                >
                  kvyverse ↗
                </a>
              </p>
            </div>
          </div>
          <footer className="tsl-hud relative z-10 flex flex-wrap items-center justify-center gap-x-3 pb-14 text-center">
            <span>MIT license</span>
            <span aria-hidden>·</span>
            <span>this page runs on three-start</span>
            <span aria-hidden>·</span>
            <a
              href={`${GITHUB_URL}/tree/main/src/landing`}
              target="_blank"
              rel="noreferrer"
            >
              view source ↗
            </a>
            <span aria-hidden>·</span>
            <a href={X_URL} target="_blank" rel="noreferrer">
              by @vladkrutenyuk ↗
            </a>
          </footer>
        </section>
      </div>
    </div>
  );
}
