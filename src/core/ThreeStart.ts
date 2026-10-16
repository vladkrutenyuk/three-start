import * as THREE from "three/webgpu";
import type { ContextModule, ThreeStartModules } from "./ContextModule";
import {
	activateSubtree,
	attachContext,
	deactivateSubtree,
	ensureExtension,
	getExtension,
	traverseActiveSelf,
} from "./Object3DExtension";
import {
	ThreeContext,
	type ThreeStartCamera,
	type ThreeStartScenes,
} from "./ThreeContext";
import { callHook } from "./utils/lifecycle-errors";

const starters = new WeakMap<ThreeContext, ThreeStart>();

/** @internal The `ThreeStart` that owns `ctx`. Used by `addScene` / `setScene`. */
export function _starterFor(ctx: ThreeContext): ThreeStart {
	const starter = starters.get(ctx);
	if (!starter) {
		throw new Error(
			`[three-start] Context is not bound to a ThreeStart instance.`
		);
	}
	return starter;
}

export interface ThreeStartOptions {
	/** The Three.js renderer to use. Defaults to a `WebGPURenderer` with antialiasing. */
	renderer?: THREE.Renderer;
	/** Override the default `PerspectiveCamera` (an `OrthographicCamera` works too). If not provided, one is created automatically and added to the scene. */
	camera?: ThreeStartCamera;
	/** Override the default `Scene`. If not provided, an empty scene is created. Registered as `scenes.Default`. */
	scene?: THREE.Scene;
	/**
	 * When `true`, the render loop is NOT started automatically on `mount()`.
	 * Call `starter.runLoop()` / `starter.stopLoop()` manually.
	 * @default false
	 */
	manageLoopManually?: boolean;
	/**
	 * Upper limit of loop ticks per second, see `ctx.maxFps`.
	 * @default Infinity
	 */
	maxFps?: number;
	/**
	 * Only matters once `maxFps` is finite — until then three.js is untouched either way.
	 *
	 * When `true`, a finite `maxFps` patches the renderer's internal animation loop: three-start
	 * swaps the `requestAnimationFrame` provider of `renderer._animation` (a private three.js
	 * field) for one that leaves out skipped frames, so three's own per-frame work — TSL
	 * `time` / `deltaTime` / `frameId`, `renderer.info` reset, the inspector — runs only on
	 * loop ticks too. The patch goes in when the loop runs with a limit set, or on the next
	 * frame after one is set, and stays until `dispose()`.
	 *
	 * When `false`, three.js is left untouched and `maxFps` skips only `Update` and `render()`:
	 * TSL `deltaTime` then measures one display frame, not the time since the last tick.
	 * Also falls back to that when the renderer has no such internal loop.
	 * @default true
	 */
	maxFpsPatchesRenderer?: boolean;
	/**
	 * When `true`, calls `renderer.init()` inside the constructor.
	 * @default true
	 */
	autoInitRenderer?: boolean;
}

/**
 * Entry point of every three-start project. Owns a single [`ThreeContext`](/docs/api/three-context),
 * registers modules, controls lifecycle (mount / loop / dispose), and bootstraps
 * the active scene on `start()`. Extra scenes: [`addScene`](/docs/api/operations) /
 * [`setScene`](/docs/api/operations).
 */
export class ThreeStart {
	/** The shared [`ThreeContext`](/docs/api/three-context) runtime (renderer, scene, camera, modules, events). Created in the constructor. */
	readonly ctx: ThreeContext;

	/**
	 * Registered scenes by name. `Default` is the constructor scene. Read-only at
	 * runtime — mutations throw. Populate via [`addScene`](/docs/api/operations).
	 * Same object as `ctx.scenes`.
	 */
	get scenes(): ThreeStartScenes {
		return this.ctx.scenes;
	}

	/** `true` once `start()` has been called. After this, modules can no longer be registered. */
	public get isStarted() {
		return this._started;
	}

	private readonly _bootstrapped = new Set<THREE.Scene>();
	private _started = false;

	constructor(options: ThreeStartOptions = {}) {
		this.ctx = new ThreeContext(options);
		starters.set(this.ctx, this);
		ensureExtension(this.ctx.scene)._isCurrentScene = true;
		// Context is NOT attached here — wait for start() so components
		// added before start() don't activate prematurely.
	}

	/**
	 * @internal Register a named scene. Called by [`addScene`](/docs/api/operations).
	 * Duplicate names throw. Duplicate scene or camera objects warn and return the existing scene.
	 */
	_addScene(
		name: string,
		scene?: THREE.Scene,
		camera?: ThreeStartCamera
	): THREE.Scene {
		if (this.ctx._hasSceneName(name)) {
			throw new Error(`[ThreeStart] Scene "${name}" is already registered.`);
		}
		if (scene && this.ctx._cameraForScene(scene)) {
			console.warn(`[ThreeStart] Scene is already registered — skipping.`);
			return scene;
		}
		if (camera) {
			const existing = this.ctx._sceneForCamera(camera);
			if (existing) {
				console.warn(`[ThreeStart] Camera is already registered — skipping.`);
				return existing;
			}
		}

		const next = scene ?? new THREE.Scene();
		const nextCamera = camera ?? new THREE.PerspectiveCamera();
		if (!nextCamera.parent) next.add(nextCamera);

		this.ctx._registerNamedScene(name, next, nextCamera);
		ensureExtension(next)._isCurrentScene = false;
		return next;
	}

	/**
	 * @internal Switch the active scene by name. Called by [`setScene`](/docs/api/operations).
	 * Unknown names throw. Same scene is a no-op.
	 */
	_setScene(name: string): void {
		const scene = this.ctx._sceneByName(name);
		if (!scene) {
			throw new Error(
				`[ThreeStart] Scene "${name}" is not registered. Add it with addScene() first.`
			);
		}

		const prevScene = this.ctx.scene;
		if (scene === prevScene) return;

		const prevCamera = this.ctx._cameraForScene(prevScene) ?? this.ctx.camera;
		const nextCamera = this.ctx._cameraForScene(scene);
		if (!nextCamera) {
			throw new Error(`[ThreeStart] Scene "${name}" has no camera.`);
		}

		ensureExtension(prevScene)._isCurrentScene = false;
		deactivateSubtree(prevScene);

		this.ctx._bindScene(scene, nextCamera);
		ensureExtension(scene)._isCurrentScene = true;

		if (this._started) {
			if (!this._bootstrapped.has(scene)) {
				this.bootstrapScene(scene);
			} else {
				activateSubtree(scene);
			}
		}

		this.ctx._notifySceneChanged(scene, prevScene, nextCamera, prevCamera);
	}

	/**
	 * Bootstrap the active scene: awaken registered [`ContextModule`](/docs/api/context-module)s, attach
	 * the context to the scene graph, and activate [`Object3DBehaviour`](/docs/api/object3d-behaviour)
	 * instances on every existing object. After `start()`, any objects added to the active scene get
	 * bootstrapped automatically. Other registered scenes wait until the first [`setScene`](/docs/api/operations)
	 * that shows them.
	 *
	 * No more modules can be registered after this call.
	 */
	start(): this {
		if (this._started) return this;
		this._started = true;

		const root = this.ctx.scene;
		attachContext(root, this.ctx);

		// Phase 0: bootstrap modules with component activation gated off.
		this.ctx._isBootstrapping = true;

		const moduleList = Object.values(this.ctx.modules) as ContextModule[];
		for (const m of moduleList) m._ctx = this.ctx;
		// A throwing hook is reported via `ThreeContextEvents.Error`; the rest still boot.
		for (const m of moduleList) callHook(m, "onAwake");
		for (const m of moduleList) callHook(m, "onStart");
		for (const m of moduleList) m._subscribe();

		this.ctx._isBootstrapping = false;

		this.awakenAndActivate(root);
		this.listenForChildren(root);
		this._bootstrapped.add(root);

		return this;
	}

	/**
	 * Register [`ContextModule`](/docs/api/context-module) instances on the context. Can be called
	 * multiple times to register them incrementally — one at a time, in groups, or all at once.
	 * The same key cannot be registered twice (subsequent attempts are skipped with a warning).
	 *
	 * **Must be called before `start()`** — modules participate in the bootstrap
	 * lifecycle (`onAwake` → `onStart`), so registering after it throws.
	 */
	addModules(modules: Partial<ThreeStartModules>): this {
		if (this._started) {
			throw new Error(`[ThreeStart] Cannot add modules after start() was called.`);
		}

		for (const [key, instance] of Object.entries(modules)) {
			if (!instance) continue;

			const added = this.ctx._registerModule(key, instance as ContextModule);
			if (!added) {
				console.warn(
					`[ThreeStart] Module "${key}" is already registered — skipping.`
				);
			}
		}
		return this;
	}

	/** Append the renderer canvas to a container and wire up resize + render loop (unless `manageLoopManually` is set). Fires `Mount`. */
	mount(container: HTMLDivElement): void {
		this.ctx.mount(container);
	}

	/** Remove the renderer canvas from DOM, disconnect resize observer. Fires `Unmount`. */
	unmount(): void {
		this.ctx.unmount();
	}

	/** Start the render loop. Resumable after `stopLoop()`. */
	runLoop(): void {
		this.ctx.runLoop();
	}

	/** Stop the render loop. Resumable via `runLoop()`. */
	stopLoop(): void {
		this.ctx.stopLoop();
	}

	/** Tear everything down: unmount, stop loop, dispose renderer and timer. */
	dispose(): void {
		this.ctx.dispose();
	}

	/**
	 * First-time bootstrap of a scene shown after `start()`: attach context, run the
	 * same awake / enable passes as `start()`, then listen for `childadded`.
	 */
	private bootstrapScene(scene: THREE.Scene) {
		attachContext(scene, this.ctx);
		this.awakenAndActivate(scene);
		this.listenForChildren(scene);
		this._bootstrapped.add(scene);
	}

	/** Phase 1 (onAwake) then Phase 2 (enable + start + subscribe) on `root`. */
	private awakenAndActivate(root: THREE.Object3D) {
		// Phase 1: Awake all components on effectively-active objects.
		// `traverseActiveSelf` prunes any subtree whose root has `activeSelf === false`,
		// so a `setActive(parent, false)` call before `start()` keeps the whole subtree dormant.
		traverseActiveSelf(root, (node) => {
			const ext = getExtension(node);
			if (!ext) return;
			if (!ext.context) ext.resolveContext();
			if (!ext.context) return;

			for (const comp of ext.components) {
				if (!comp._ctx) comp._ctx = ext.context;
				if (!comp._awoken) {
					comp._awoken = true;
					callHook(comp, "onAwake");
				}
			}
		});

		// Phase 2: Enable + Start + Subscribe for enabled components on the same set.
		traverseActiveSelf(root, (node) => {
			const ext = getExtension(node);
			if (!ext) return;

			for (const comp of ext.components) {
				if (comp.enabled) {
					comp._activate(); // skips awake since already done in phase 1
				}
			}
		});
	}

	/**
	 * Bootstrap a single node: resolve context and activate its components.
	 * Used for objects added to the hierarchy after start().
	 */
	private bootstrapNode(node: THREE.Object3D) {
		const ext = getExtension(node);
		if (!ext) return;
		if (!ext.activeInHierarchy) return;

		if (!ext.context) ext.resolveContext();
		if (!ext.context) return;

		for (const comp of ext.components) {
			if (!comp._ctx) comp._ctx = ext.context;
			if (comp.enabled) {
				comp._activate();
			}
		}
	}

	/**
	 * Recursively attach `childadded` listeners so any new descendant
	 * gets bootstrapped and also starts listening for its own children.
	 */
	private listenForChildren(obj: THREE.Object3D) {
		obj.addEventListener("childadded", this.onChildAdded);
		for (const child of obj.children) {
			this.listenForChildren(child);
		}
	}

	private onChildAdded = (
		event: {
			child: THREE.Object3D;
		} & THREE.Event<"childadded", THREE.Object3D>
	) => {
		event.child.traverse(this._callback);
	};

	private _callback = (node: THREE.Object3D) => {
		// Ensure extension exists so context can be resolved
		const ext = getExtension(node);
		if (ext && !ext.context) ext.resolveContext();

		// Bootstrap components on this node
		this.bootstrapNode(node);

		// Listen for future children on this node
		node.addEventListener("childadded", this.onChildAdded);
	};
}
