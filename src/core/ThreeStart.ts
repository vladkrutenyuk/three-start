import type * as THREE from "three/webgpu";
import { ContextModule, type ThreeStartModules } from "./ContextModule";
import { attachContext, getExtension, traverseActiveSelf } from "./Object3DExtension";
import { ThreeContext } from "./ThreeContext";

export interface ThreeStartOptions {
	/** The Three.js renderer to use. Defaults to a `WebGPURenderer` with antialiasing. */
	renderer?: THREE.Renderer;
	/** Override the default `PerspectiveCamera`. If not provided, one is created automatically and added to the scene. */
	camera?: THREE.PerspectiveCamera;
	/** Override the default `Scene`. If not provided, an empty scene is created. */
	scene?: THREE.Scene;
	/**
	 * When `true`, the render loop is NOT started automatically on `mount()`.
	 * Call `starter.runLoop()` / `starter.stopLoop()` manually.
	 * @default false
	 */
	manageLoopManually?: boolean;
	/**
	 * When `true`, calls `renderer.init()` inside the constructor.
	 * @default true
	 */
	autoInitRenderer?: boolean;
}

/**
 * Entry point of every three-start project. Owns a single [`ThreeContext`](/docs/api/three-context),
 * registers modules, controls lifecycle (mount / loop / dispose), and bootstraps the scene on `start()`.
 */
export class ThreeStart {
	/** The shared [`ThreeContext`](/docs/api/three-context) runtime (renderer, scene, camera, modules, events). Created in the constructor. */
	readonly ctx: ThreeContext;

	/** `true` once `start()` has been called. After this, modules can no longer be registered. */
	public get isStarted() {
		return this._started;
	}

	private readonly _root: THREE.Object3D;
	private _started = false;

	constructor(options: ThreeStartOptions = {}) {
		this.ctx = new ThreeContext(options);
		this._root = this.ctx.scene;
		// Context is NOT attached here — wait for start() so components
		// added before start() don't activate prematurely.
	}

	/**
	 * Bootstrap the scene: awaken registered [`ContextModule`](/docs/api/context-module)s, attach
	 * the context to the scene graph, and activate [`Object3DBehaviour`](/docs/api/object3d-behaviour)
	 * instances on every existing object. After `start()`, any objects added to the scene get
	 * bootstrapped automatically.
	 *
	 * No more modules can be registered after this call.
	 */
	start(): this {
		if (this._started) return this;
		this._started = true;

		attachContext(this._root, this.ctx);

		// Phase 0: bootstrap modules with component activation gated off.
		this.ctx._isBootstrapping = true;

		const moduleList = Object.values(this.ctx.modules) as ContextModule[];
		for (const m of moduleList) m._ctx = this.ctx;
		for (const m of moduleList) m.onAwake();
		for (const m of moduleList) m.onStart();
		for (const m of moduleList) m._subscribe();

		this.ctx._isBootstrapping = false;

		// Phase 1: Awake all components on effectively-active objects.
		// `traverseActiveSelf` prunes any subtree whose root has `activeSelf === false`,
		// so a `setActive(parent, false)` call before `start()` keeps the whole subtree dormant.
		traverseActiveSelf(this._root, (node) => {
			const ext = getExtension(node);
			if (!ext) return;
			if (!ext.context) ext.resolveContext();
			if (!ext.context) return;

			for (const comp of ext.components) {
				if (!comp._ctx) comp._ctx = ext.context;
				if (!comp._awoken) {
					comp._awoken = true;
					comp.onAwake();
				}
			}
		});

		// Phase 2: Enable + Start + Subscribe for enabled components on the same set.
		traverseActiveSelf(this._root, (node) => {
			const ext = getExtension(node);
			if (!ext) return;

			for (const comp of ext.components) {
				if (comp.enabled) {
					comp._activate(); // skips awake since already done in phase 1
				}
			}
		});

		// Listen for future children added anywhere in the hierarchy
		this.listenForChildren(this._root);

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
