import type * as THREE from "three";
import type { Object3DExtension } from "./Object3DExtension";
import { ThreeContextEvents, type ThreeContext } from "./ThreeContext";
import type { ThreeStartModules } from "./ContextModule";
import { TypedEmitter, type EventMap } from "./TypedEmitter";

const proto = () => Object3DBehaviour.prototype;

/**
 * Base class for components attached to a Three.js `Object3D`. Extend it, override lifecycle
 * hooks (`onAwake`, `onUpdate`, `onDestroy`, …), and attach via [`addComponent`](/docs/api/operations).
 * Every instance gets `this.object`, the shared [`ThreeContext`](/docs/api/three-context) as
 * `this.ctx`, and access to registered [`ContextModule`](/docs/api/context-module) instances via `this.modules`.
 */
export abstract class Object3DBehaviour<
	TEvents extends EventMap = {},
> extends TypedEmitter<TEvents> {
	readonly isObject3DBehaviour = true;

	/** @internal */ _object: THREE.Object3D | null = null;
	/** @internal */ _ctx: ThreeContext | null = null;
	/** @internal */ _ext: Object3DExtension | null = null;
	/** @internal */ _awoken = false;
	/** @internal */ _started = false;
	/** @internal */ _isActive = false;

	private _enabled = true;

	/** The Three.js `Object3D` this component is attached to. Available from `onAwake` onwards. */
	get object(): THREE.Object3D {
		return this._object!;
	}

	/** The shared [`ThreeContext`](/docs/api/three-context) runtime. Available from `onAwake` onwards. */
	get ctx(): ThreeContext {
		return this._ctx!;
	}

	/** Shortcut to registered [`ContextModule`](/docs/api/context-module) instances: `this.modules.myModule`. */
	get modules(): ThreeStartModules {
		return this._ctx!.modules;
	}

	/** `true` while the component is enabled. Toggle with `enable()` / `disable()` / `setEnabled()`. */
	get enabled() {
		return this._enabled;
	}

	/** Enable the component. Fires `onEnable` if the owning object is active and the context is available. */
	enable() {
		this.setEnabled(true);
	}
	/** Disable the component. Fires `onDisable` if it was active and unsubscribes per-frame hooks. */
	disable() {
		this.setEnabled(false);
	}
	/** Set the enabled flag explicitly. No-op if the value is unchanged. */
	setEnabled(enabled: boolean) {
		if (this._enabled === enabled) return;
		this._enabled = enabled;

		// don't trigger lifecycle if object isn't effectively active or no context
		if (!this._ext?.activeInHierarchy) return;
		if (!this._ctx) return;

		if (enabled) {
			this._activate();
		} else {
			this._deactivate();
		}
	}

	/**
	 * @internal Called when object active + component enabled + context available.
	 * Handles: awake (once) → enable → start (once) → subscribe.
	 */
	_activate() {
		if (this._isActive) return;
		if (!this._ctx) return;
		this._isActive = true;

		if (!this._awoken) {
			this._awoken = true;
			this.onAwake();
		}

		this.onEnable();

		if (!this._started) {
			this._started = true;
			this.onStart();
		}

		this._subscribe();
	}

	/**
	 * @internal Called when object deactivated, component disabled, or destroyed.
	 * Unsubscribes from per-frame events and calls onDisable.
	 */
	_deactivate() {
		if (!this._isActive) return;
		this._isActive = false;

		this._unsubscribe();
		this.onDisable();
	}

	/** @internal Subscribe to per-frame ctx events only if the method is overridden. */
	private _subscribe() {
		const ctx = this._ctx!;
		const p = proto();
		const self: any = this;

		if (this.onUpdate !== p.onUpdate) {
			ctx.on(ThreeContextEvents.Update, this.onUpdate, self);
		}
		if (this.onBeforeRender !== p.onBeforeRender) {
			ctx.on(ThreeContextEvents.RenderBefore, this.onBeforeRender, self);
		}
		if (this.onAfterRender !== p.onAfterRender) {
			ctx.on(ThreeContextEvents.RenderAfter, this.onAfterRender, self);
		}
	}

	/** @internal Unsubscribe from all per-frame ctx events. Safe to call even if not subscribed. */
	private _unsubscribe() {
		if (!this._ctx) return;
		const ctx = this._ctx;
		const self: any = this;

		ctx.off(ThreeContextEvents.Update, this.onUpdate, self);
		ctx.off(ThreeContextEvents.RenderBefore, this.onBeforeRender, self);
		ctx.off(ThreeContextEvents.RenderAfter, this.onAfterRender, self);
	}

	/**
	 * @internal Deactivate, fire onDestroy, clean up all references.
	 */
	_destroy() {
		this._deactivate();
		this.onDestroy();
		this._removeAllListeners();
		this._object = null;
		this._ext = null;
		this._ctx = null;
	}

	// lifecycle

	/**
	 * Called once when the component first becomes active. Use for one-time initialization. Runs before `onEnable` and `onStart`.
	 * @lifecycle
	 * @override
	 */
	onAwake() {}
	/**
	 * Called once after `onEnable`, on the first activation. Runs after all modules and sibling components have awakened.
	 * @lifecycle
	 * @override
	 */
	onStart() {}
	/**
	 * Called every time the component transitions from disabled → enabled. Also runs on the first activation (after `onAwake`).
	 * @lifecycle
	 * @override
	 */
	onEnable() {}
	/**
	 * Called every time the component transitions from enabled → disabled, and before `onDestroy`.
	 * @lifecycle
	 * @override
	 */
	onDisable() {}
	/**
	 * Called once per frame while the component is active. Override to run per-frame logic.
	 * @lifecycle
	 * @override
	 */
	onUpdate() {}
	/**
	 * Called once per frame, before the scene is rendered. Override to run pre-render logic.
	 * @lifecycle
	 * @override
	 */
	onBeforeRender() {}
	/**
	 * Called once per frame, after the scene is rendered. Override to run post-render logic.
	 * @lifecycle
	 * @override
	 */
	onAfterRender() {}
	/**
	 * Called when the component is destroyed. Use to dispose resources, cancel requests, or remove external listeners.
	 * @lifecycle
	 * @override
	 */
	onDestroy() {}
}

export type Object3DBehaviourConstructor<
	T extends Object3DBehaviour = Object3DBehaviour,
	TArgs extends any[] = any[],
> = new (...args: TArgs) => T;
