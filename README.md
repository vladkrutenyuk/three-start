# three-start

[![npm](https://img.shields.io/npm/v/three-start.svg)](https://npmjs.com/package/three-start)
[![types](https://img.shields.io/npm/types/three-start.svg)](#)
[![minzip](https://badgen.net/bundlephobia/minzip/three-start)](https://bundlephobia.com/package/three-start)
[![GitHub](https://img.shields.io/github/stars/vladkrutenyuk/three-start?style=social)](https://github.com/vladkrutenyuk/three-start)
[![Twitter](https://img.shields.io/twitter/follow/vladkrutenyuk
)](https://x.com/vladkrutenyuk)

A minimal foundation layer for [Three.js](https://threejs.org/). It bootstraps the renderer, scene, camera, animation loop, and resize handling for you, and gives you a single component / lifecycle model to build the rest of your logic on — without replacing anything Three.js already does well.

**Docs:** https://three-start.com

## What it gives you

- **Zero boilerplate.** Renderer, scene, camera, animation loop, resize — already set up. Mount the canvas and start.
- **Components on objects.** Write a class that extends `Object3DBehaviour`, override `onUpdate` / `onAwake` / `onDestroy` — attach it to an `Object3D`. The component hooks itself into the loop and the lifecycle.
- **A single way to turn logic on and off.** `component.enable()/disable()` or `setActive(obj, true/false)` — cascades activation or deactivation through a whole slice of the world, with all its components. No public "handle" methods, no passing references around.
- **Global systems as context modules.** Input, physics, asset manager, audio live in a `ContextModule` with the same lifecycle. Any component accesses them via `this.modules.<key>`.
- **Uniform code.** Every component looks the same. You can read someone else's scene at a glance. Teams collaborate more easily. LLMs don't destroy your architecture — they have a clear frame to work within.
- **Minimal overhead.** Per-frame event subscriptions are created **only if the method is overridden**. An empty component pays nothing for dispatch.

## Install

```sh
npm i three-start
```

`three` and `eventemitter3` are peer dependencies — install them in your project alongside three-start.

> **Requires `three >= 0.183`.** three-start uses [`THREE.RenderPipeline`](https://threejs.org/docs/#api/en/renderers/webgpu/RenderPipeline) under the hood, which was introduced in r183. Older releases will not work.

## No talk, just show me some code

```ts
import * as THREE from "three";
import { ThreeStart, Object3DBehaviour, addComponent } from "three-start";

const starter = new ThreeStart();

const { scene, camera } = starter.ctx;
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshMatcapMaterial());
scene.add(cube);

addComponent(cube, Spin);
addComponent(cube, Bob);

starter.mount(document.getElementById("three")!);
starter.start();
```

> [!TIP]
> **Try the principles above interactively → [three-start.com/docs](https://three-start.com/docs)**
> The overview page runs this exact `Spin` + `Bob` setup in a live demo where you can add, destroy, enable/disable each component and toggle the whole object's `setActive` state — useful before reading the rest of this README.

```ts
class Spin extends Object3DBehaviour {
  speed = 2;
  private _initRotY = 0;

  onAwake() {
    this._initRotY = this.object.rotation.y;
  }

  onUpdate() {
    this.object.rotation.y += this.speed * this.ctx.getDeltaTime();
  }

  onDestroy() {
    // restore the rotation Spin was started with
    this.object.rotation.y = this._initRotY;
  }
}

class Bob extends Object3DBehaviour {
  amplitude = 0.5;
  frequency = 2; // cycles per second
  private baseY = 0;

  onAwake() {
    this.baseY = this.object.position.y;
  }

  onUpdate() {
    const t = this.ctx.getTime();
    this.object.position.y =
      this.baseY + Math.sin(t * this.frequency * Math.PI * 2) * this.amplitude;
  }
}
```

That snippet above is the entire project. The render loop, frame time (`getDeltaTime()` / `getTime()`), canvas resize, and lifecycle teardown are already wired up — the only code you wrote is the per-component logic itself.

The same handful of operations — `addComponent`, `getComponent`, `setActive`, `destroy` — and the same lifecycle event methods cover every component on every object, at any depth.

## Who it's for

three-start is for you if you:

- write Three.js in vanilla + OOP, not through React Three Fiber
- are tired of writing the same bootstrap in every new project
- want your code to look uniform and stay readable without context
- are planning a project more complex than a single demo
- share code, work on a team, or teach others
- vibe-code and want the AI to stop destroying your architecture a week in

three-start is **not for you** if you prefer the React paradigm in 3D. In that case [R3F](https://r3f.docs.pmnd.rs/) is a great choice, and these aren't competing tools.

## Documentation

Full guides, API reference, and live examples live at **https://three-start.com**:

- [Lifecycle](https://three-start.com/docs/core-guides/lifecycle) — when components and modules become active, tick, and are destroyed.
- [setActive](https://three-start.com/docs/core-guides/set-active) — `activeSelf` / `activeInHierarchy` semantics for toggling whole subtrees.
- [Writing a component](https://three-start.com/docs/core-guides/writing-component)
- [Writing a module](https://three-start.com/docs/core-guides/writing-modules)
- [Context](https://three-start.com/docs/core-guides/context)
- [TypeScript](https://three-start.com/docs/core-guides/typescript)
- [API reference](https://three-start.com/docs/api/three-start)

## Why it exists

three-start is a thin layer that solves four specific recurring problems in Three.js projects: the boilerplate, the missing logic model, fragmented community code, and the mismatch with React paradigms for vanilla / OOP authors.

### The boilerplate

Spinning up a Three.js scene always starts with the same dozens of lines: renderer, scene, camera, DPR-aware sizing, a `ResizeObserver` or window listener, a `requestAnimationFrame` loop, a timer for delta and elapsed time. None of this is interesting, none of it is project-specific, and none of it is standardized across the ecosystem — everyone copies their own preferred snippet.

### No model for logic

Once you have a renderer and a scene, you need logic. Things that move, react, initialize, and eventually go away. Three.js has no opinion about how that works — and filling that gap yourself is where most projects start to crack.

**Where does `update` come from?** The moment a project has more than one thing happening per frame, this becomes the central question. What you see in the wild:

- a single `animate()` function that imports every moving part and calls them in order
- a growing list of callbacks registered to a hand-rolled event bus
- per-object closures captured over shared state, triggered from a god-loop
- framework-shaped abstractions reinvented from scratch in every project

All of these work for a single cube. None of them scale cleanly. The loop becomes the dumping ground where every module's per-frame concerns collide.

**Lifecycle is the same story.** Every piece of logic also has something to set up on start, and something to clean up when it's done. Without a shared pattern, cleanup is forgotten or re-invented per project. Init code scatters across constructors, factory functions, and ad-hoc `setup()` calls that may or may not run in the right order. Adding a new system means answering the same questions again from scratch: where does it live, how does it start, where does its update go, what happens on destroy?

**And then there's control.** A complex object — a player, an enemy, a UI overlay — is often many systems working together: input, animation, physics, sound. All of them need to start together and stop together. Without a standard interface, pausing the game means reaching into each one manually and calling whatever you happened to name the method — `disable()`, `pause()`, `setSleeping()`, `mute()` — using references you threaded there yourself. Every piece has its own API. Every new system makes the wiring bigger.

> **Picture this:** your player has four systems and you want to pause the game. You call `inputManager.disable()`, `animator.pause()`, `physicsBody.setSleeping(true)`, `soundEmitter.mute()` — all different APIs, all in different places, held together by memory and discipline. Add two more systems next week. Forget to update the pause function. Now you have a bug that only appears after a specific sequence in production.

The pattern doesn't get better on its own — it just grows with the project.

### Fragmented community code

Any Three.js example you open — on CodeSandbox, in a Twitter thread, in a repo — is structured differently from the last one. There's no shared mental model, so to understand a demo you read it end to end. This slows the whole ecosystem: harder to learn from, harder to contribute to, harder to onboard into a team.

### Why this isn't R3F

[React Three Fiber](https://r3f.docs.pmnd.rs/) addresses the same organizational problem, and does it well — but by importing the React paradigm, designed for UI, into interactive 3D logic. For people who prefer vanilla + OOP (and there are a lot of us), that trade-off isn't the right one.

**three-start is the answer for them.** A thin layer that standardizes the bootstrap, the lifecycle, and the way logic is split and wired — without pulling in a rendering paradigm from another domain.

## License

[MIT](LICENSE) © Vladislav Kruteniuk

---