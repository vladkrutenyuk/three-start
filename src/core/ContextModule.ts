import { ThreeContextEvents, type ThreeContext } from "./ThreeContext";
import type { RegisterField } from "./Register";
import { TypedEmitter, type EventMap } from "./TypedEmitter";

const proto = () => ContextModule.prototype;

/**
 * Map of modules attached to the context. Populate via the `Register` pattern:
 *
 * ```ts
 * declare module "three-start" {
 *   interface ThreeStartRegister {
 *     modules: {
 *       physics: PhysicsModule;
 *       input: InputModule;
 *     };
 *   }
 * }
 * ```
 *
 * Without registration, falls back to a loose `Record<string, ContextModule>`.
 */
export type ThreeStartModules = RegisterField<"modules", Record<string, ContextModule>>;

/**
 * Base class for global systems — input, physics, assets, audio, HUD, etc. Extend it to create
 * a singleton that lives on the [`ThreeContext`](/docs/api/three-context) and participates in the
 * bootstrap lifecycle. Register via [`starter.addModules()`](/docs/api/three-start); access from any
 * [`Object3DBehaviour`](/docs/api/object3d-behaviour) or sibling module via `this.modules.<key>`.
 */
export abstract class ContextModule<
	TEvents extends EventMap = {},
> extends TypedEmitter<TEvents> {
	/** @internal */ _ctx: ThreeContext | null = null;

	/** The shared [`ThreeContext`](/docs/api/three-context) runtime. Available from `onAwake` onwards. */
	get ctx(): ThreeContext {
		return this._ctx!;
	}

	/** Shortcut to sibling [`ContextModule`](/docs/api/context-module) instances: `this.modules.myModule`. */
	get modules(): ThreeStartModules {
		return this._ctx!.modules;
	}

	// lifecycle

	/**
	 * Called once during [`starter.start()`](/docs/api/three-start), before any component lifecycle. Use for one-time module initialization.
	 * @lifecycle
	 * @override
	 */
	onAwake() {}
	/**
	 * Called once after all modules have awakened. Use for cross-module wiring that requires other modules to be ready.
	 * @lifecycle
	 * @override
	 */
	onStart() {}

	/**
	 * Called once per frame while the module is registered. Fires before any component `onUpdate`.
	 * @lifecycle
	 * @override
	 */
	onUpdate() {}
	/**
	 * Called once per frame before the scene renders. Fires before any component `onBeforeRender`.
	 * @lifecycle
	 * @override
	 */
	onBeforeRender() {}
	/**
	 * Called once per frame after the scene renders. Fires before any component `onAfterRender`.
	 * @lifecycle
	 * @override
	 */
	onAfterRender() {}

	/** @internal Subscribe to per-frame ctx events only if the method is overridden. */
	_subscribe() {
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
	_unsubscribe() {
		if (!this._ctx) return;
		const ctx = this._ctx;
		const self: any = this;

		ctx.off(ThreeContextEvents.Update, this.onUpdate, self);
		ctx.off(ThreeContextEvents.RenderBefore, this.onBeforeRender, self);
		ctx.off(ThreeContextEvents.RenderAfter, this.onAfterRender, self);
	}
}
