import * as THREE from "three/webgpu";
import { createReadonlyView, defineProps, readOnly } from "./utils/define-props";
import { pass } from "three/tsl";
import type { ContextModule, ThreeStartModules } from "./ContextModule";
import type { ThreeStartOptions } from "./ThreeStart";
import { TypedEmitter } from "./TypedEmitter";

// three-start

/**
 * The shared runtime of a scene — renderer, camera, animation loop, timer, render pipeline,
 * event bus, and [`ContextModule`](/docs/api/context-module) registry. Created and owned
 * by [`ThreeStart`](/docs/api/three-start); exposed to every
 * [`Object3DBehaviour`](/docs/api/object3d-behaviour) and module as `this.ctx`.
 */
export class ThreeContext extends TypedEmitter<ThreeContextEventMap> {
	public readonly isThreeContext!: true;

	/** The Three.js renderer owned by this context. Sealed at construction. */
	public readonly renderer!: THREE.Renderer;

	/** The root `Scene` that components and the camera live in. Sealed at construction. */
	public readonly scene!: THREE.Scene;

	/** The render pipeline used by the default render function. Sealed at construction. */
	public readonly renderPipeline!: THREE.RenderPipeline;

	/** The scene pass node fed into `renderPipeline`. Attach post-processing effects to it via TSL. */
	public readonly scenePass!: THREE.PassNode;

	/** Registered [`ContextModule`](/docs/api/context-module) instances, keyed by name. Read-only at runtime — mutations throw. Populate via `starter.addModules()` before `start()`. */
	public readonly modules!: ThreeStartModules;

	/** @internal Backing store for `modules`. `_registerModule` is the only way to add to it. */
	private readonly _modules: Record<string, ContextModule> = {};

	/** The active camera. Reassigning it swaps the camera used by the scene pass and fires `CameraChanged`. */
	public get camera() {
		return this._camera;
	}
	public set camera(value: THREE.PerspectiveCamera) {
		const prevCamera = this._camera;
		this._camera = value;
		this.cameraChanged(value, prevCamera);
	}

	/** The HTML element the renderer canvas is currently mounted into, or `null` if not mounted. */
	public get canvasContainer(): HTMLDivElement | null {
		return this._canvasContainer;
	}

	/** `true` while the renderer canvas is attached to a container (between `mount()` and `unmount()`). */
	public get isMounted(): boolean {
		return this._isMounted;
	}

	/** `true` while the animation loop is running (between `runLoop()` and `stopLoop()`). */
	public get isLoopRunning(): boolean {
		return this._isLoopRunning;
	}

	/**
	 * @internal While `true`, `Object3DExtension.addComponent` defers component
	 * activation. Set by `ThreeStart.start()` during module bootstrap so that
	 * components created inside a module's `onAwake`/`onStart` don't subscribe
	 * to ctx events before modules themselves subscribe.
	 */
	_isBootstrapping = false;

	private readonly _timer: THREE.Timer;
	private _camera: THREE.PerspectiveCamera;
	private _canvasContainer: HTMLDivElement | null = null;
	private _resizeObserver: ResizeObserver | null = null;
	private _isMounted = false;
	private _isLoopRunning = false;

	/** Seconds elapsed since the previous tick, scaled by `timescale`. Use inside per-frame methods. */
	getDeltaTime = () => this._timer.getDelta();

	/** Total elapsed time in seconds since the loop started, scaled by `timescale`. */
	getTime = () => this._timer.getElapsed();

	/** Current time-scaling factor. `1` = realtime, `0` = paused, `2` = 2× speed. */
	getTimescale = () => this._timer.getTimescale();

	/** Change the time-scaling factor applied to `getDeltaTime` / `getTime`. `1` = realtime, `0` = paused. */
	setTimescale = (value: number): this => {
		this._timer.setTimescale(value);
		return this;
	};

	private _srcRenderFn = () => {
		if (!this.renderer.initialized) return;
		this.renderPipeline.render();
	};
	private _renderFn = this._srcRenderFn;

	constructor(readonly options: ThreeStartOptions) {
		super();

		const renderer =
			options.renderer ?? new THREE.WebGPURenderer({ antialias: true });
		if (options.autoInitRenderer ?? true) {
			renderer.init();
		}
		this._timer = new THREE.Timer();
		const scene = options.scene ?? new THREE.Scene();
		this._camera = options.camera ?? new THREE.PerspectiveCamera();
		if (!this._camera.parent) {
			scene.add(this._camera);
		}
		const scenePass = pass(scene, this._camera);
		const renderPipeline = new THREE.RenderPipeline(renderer, scenePass);

		defineProps(this, {
			isThreeContext: readOnly(true),
			modules: readOnly(createReadonlyView(this._modules, "ctx.modules")),
			renderer: readOnly(renderer),
			scene: readOnly(scene),
			scenePass: readOnly(scenePass),
			renderPipeline: readOnly(renderPipeline),
		});
	}

	/** @internal Register a module. Called by `ThreeStart.addModules()` before `start()`. Returns `false` if the key already exists. */
	_registerModule(key: string, instance: ContextModule): boolean {
		if (this._modules[key]) return false;
		this._modules[key] = instance;
		return true;
	}

	/**
	 * @internal Use `starter.mount(container)` instead.
	 * Appends the renderer canvas, initializes event listeners and resize observer, fires `Mount`.
	 */
	mount = (container: HTMLDivElement): void => {
		if (this._isMounted) return;
		this._isMounted = true;

		const canvas = this.renderer.domElement;

		this._canvasContainer = container;
		container.append(canvas);
		canvas.tabIndex = 0;
		canvas.style.touchAction = "none";

		this.emit(ThreeContextEvents.Mount, container);

		this._resizeObserver = new ResizeObserver(this.resizeHandler);
		this._resizeObserver.observe(container);
		this.resizeHandler();

		if (!this.options.manageLoopManually) {
			this.runLoop();
		}
	};

	/**
	 * @internal Use `starter.unmount()` instead.
	 * Removes the canvas from DOM, disconnects the resize observer, fires `Unmount`.
	 */
	unmount = (): void => {
		if (!this._isMounted) return;
		this._isMounted = false;

		this._resizeObserver?.disconnect();
		this._resizeObserver = null;
		this.renderer.domElement.remove();

		this.emit(ThreeContextEvents.Unmount);

		if (!this.options.manageLoopManually) {
			this.stopLoop();
		}
	};

	/**
	 * @internal Use `starter.runLoop()` instead.
	 * Starts the render loop; re-runnable after `stopLoop()`.
	 */
	runLoop = (): void => {
		if (this._isLoopRunning) return;
		this._isLoopRunning = true;

		this._timer.connect(document);

		this.renderer.setAnimationLoop((timestamp) => {
			this._timer.update(timestamp);
			this.emit(ThreeContextEvents.Update);
			this.render();
		});
		this.emit(ThreeContextEvents.LoopRun);
	};

	/**
	 * @internal Use `starter.stopLoop()` instead.
	 * Stops the render loop; resumable via `runLoop()`.
	 */
	stopLoop = (): void => {
		if (!this._isLoopRunning) return;
		this._isLoopRunning = false;

		this._timer.disconnect();
		this._timer.reset();

		this.renderer.setAnimationLoop(null);
		this.emit(ThreeContextEvents.LoopStop);
	};

	/**
	 * @internal Use `starter.dispose()` instead.
	 * Tears down the context: unmount, stop loop, dispose renderer and timer.
	 */
	dispose = (): void => {
		this.unmount();
		this.stopLoop();
		this.renderer.dispose();
		this._removeAllListeners();
		this._timer.disconnect();
		this._timer.dispose();
	};

	/** Render once using the current render function. Fires `RenderBefore` / `RenderAfter`. */
	render = (): void => {
		this.emit(ThreeContextEvents.RenderBefore);
		this._renderFn();
		this.emit(ThreeContextEvents.RenderAfter);
	};

	/** Replace the render function with a custom implementation. Restore via `resetRender()`. */
	overrideRender = (fn: () => void): this => {
		this._renderFn = fn;
		return this;
	};

	/** Restore the default render function (undoes `overrideRender`). */
	resetRender = (): this => {
		this._renderFn = this._srcRenderFn;
		return this;
	};

	private resizeHandler = () => {
		const container = this._canvasContainer;
		if (!container) return;

		const width = container.offsetWidth;
		const height = container.offsetHeight;

		const camera = this._camera;

		camera.aspect = width / height;
		camera.updateProjectionMatrix();

		this.renderer.setSize(width, height);
		this.emit(ThreeContextEvents.Resized, width, height);
		this.render();
	};

	private cameraChanged(
		newCamera: THREE.PerspectiveCamera,
		prevCamera: THREE.PerspectiveCamera
	) {
		// Rebind the scene pass to the new camera so the render pipeline picks it up.
		this.scenePass.camera = newCamera;
		// Attach to the scene if the camera is floating (matches constructor behaviour).
		if (!newCamera.parent) this.scene.add(newCamera);

		const root = this._canvasContainer;
		if (root) {
			newCamera.aspect = root.offsetWidth / root.offsetHeight;
		}
		newCamera.updateProjectionMatrix();

		this.emit(ThreeContextEvents.CameraChanged, newCamera, prevCamera);
		this.render();
	}
}

export enum ThreeContextEvents {
	/** Fired once per animation frame, before `RenderBefore` and rendering. Driver of all per-frame logic. */
	Update = "update",
	/** Fired once per animation frame, just before the scene is rendered. Use to mutate state right before draw. */
	RenderBefore = "renderbefore",
	/** Fired once per animation frame, immediately after the scene is rendered. */
	RenderAfter = "renderafter",
	/** Fired when `starter.mount(container)` succeeds. Carries the container element. */
	Mount = "mount",
	/** Fired when `starter.unmount()` runs. */
	Unmount = "unmount",
	/** Fired when `ctx.camera` is reassigned. Carries the new and previous cameras. */
	CameraChanged = "camerachanged",
	/** Fired when the canvas container resizes (and once on first mount). Carries the new pixel dimensions. */
	Resized = "resized",
	/** Fired when `starter.runLoop()` starts the animation loop. */
	LoopRun = "looprun",
	/** Fired when `starter.stopLoop()` halts the animation loop. */
	LoopStop = "loopstop",
}

export type ThreeContextEventMap = {
	[ThreeContextEvents.Update]: [];
	[ThreeContextEvents.RenderBefore]: [];
	[ThreeContextEvents.RenderAfter]: [];
	[ThreeContextEvents.Mount]: [root: HTMLDivElement];
	[ThreeContextEvents.Unmount]: [];
	[ThreeContextEvents.Resized]: [width: number, height: number];
	[ThreeContextEvents.CameraChanged]: [
		newCamera: THREE.PerspectiveCamera,
		prevCamera: THREE.PerspectiveCamera,
	];
	[ThreeContextEvents.LoopRun]: [];
	[ThreeContextEvents.LoopStop]: [];
};
