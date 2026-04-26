import type * as THREE from "three";
import type {
	Object3DBehaviour,
	Object3DBehaviourConstructor,
} from "./Object3DBehaviour";
import type { ThreeContext } from "./ThreeContext";
import { notEnumer } from "./utils/define-props";

/** @internal */
export const EXT = Symbol.for("three-start:ext");

export class Object3DExtension {
	readonly components: Object3DBehaviour[] = [];
	context: ThreeContext | null = null;

	private _active = true;

	/**
	 * This object's own active flag — the value last passed to `setActive(obj, ...)`,
	 * or `true` by default. Whether components actually run depends on the full
	 * chain — see {@link Object3DExtension.activeInHierarchy}.
	 */
	get activeSelf(): boolean {
		return this._active;
	}

	/**
	 * Whether this object is effectively active: its own flag is `true` AND every
	 * ancestor in the scene tree is also active. Components on this object only
	 * run their lifecycle while this is `true`.
	 */
	get activeInHierarchy(): boolean {
		if (!this._active) return false;
		return parentChainActive(this.object);
	}

	constructor(public readonly object: THREE.Object3D) {}

	addComponent<T extends Object3DBehaviour>(klass: Object3DBehaviourConstructor<T>): T {
		const component = new klass();

		component._object = this.object;
		component._ext = this;
		component._ctx = this.resolveContext();

		this.components.push(component);

		// Skip immediate activation while ThreeStart is bootstrapping modules —
		// it runs a traversal after modules are ready and will activate us then.
		// This guarantees modules subscribe to ctx events before any component.
		if (
			component._ctx &&
			this.activeInHierarchy &&
			component.enabled &&
			!this.context?._isBootstrapping
		) {
			component._activate();
		}

		return component;
	}

	destroyComponent(comp: Object3DBehaviour) {
		const idx = this.components.indexOf(comp);
		if (idx !== -1) this.components.splice(idx, 1);
		comp._destroy();
	}

	destroyAllComponents() {
		for (const comp of [...this.components]) {
			comp._destroy();
		}
		this.components.length = 0;
	}

	setActive(active: boolean) {
		if (this._active === active) return;
		this._active = active;

		// If our parent chain isn't fully active, our effective state stays inactive
		// regardless of this flip. Components in our subtree weren't running and won't.
		if (!parentChainActive(this.object)) return;

		// Our effective state just transitioned. Cascade through the subtree, stopping
		// at any descendant whose own `activeSelf` is false (its subtree was already
		// effectively inactive and stays that way).
		if (active) {
			activateSubtree(this.object);
		} else {
			deactivateSubtree(this.object);
		}
	}

	/**
	 * Walk up the parent chain to find the nearest Object3DExtension
	 * that already has a ThreeContext attached, and cache it.
	 */
	resolveContext(): ThreeContext | null {
		if (this.context) return this.context;

		let current = this.object.parent;
		while (current) {
			const parentExt = getExtension(current);
			if (parentExt?.context) {
				this.context = parentExt.context;
				return this.context;
			}
			current = current.parent;
		}
		return null;
	}

}

export function getExtension(obj: THREE.Object3D): Object3DExtension | null {
	return (obj as any)[EXT] ?? null;
}

export function ensureExtension(obj: THREE.Object3D): Object3DExtension {
	let ext = (obj as any)[EXT] as Object3DExtension | undefined;
	if (!ext) {
		ext = new Object3DExtension(obj);
		Object.defineProperty(obj, EXT, notEnumer(ext));
	}
	return ext;
}

export function attachContext(obj: THREE.Object3D, ctx: ThreeContext) {
	const ext = ensureExtension(obj);
	ext.context = ctx;
}

/**
 * Whether every ancestor of `obj` (excluding `obj` itself) has `activeSelf === true`,
 * treating ancestors without an extension as active.
 * @internal
 */
export function parentChainActive(obj: THREE.Object3D): boolean {
	let p = obj.parent;
	while (p) {
		const e = getExtension(p);
		if (e && !e.activeSelf) return false;
		p = p.parent;
	}
	return true;
}

/**
 * Whether `obj` is effectively active: its own flag and every ancestor's flag are all true.
 * Objects (and ancestors) without an extension count as active.
 * @internal
 */
export function isActiveInHierarchy(obj: THREE.Object3D): boolean {
	const e = getExtension(obj);
	if (e && !e.activeSelf) return false;
	return parentChainActive(obj);
}

/**
 * Walk `root` and its descendants, invoking `cb` on each node whose own `activeSelf`
 * is true (or that has no extension). Stops descent at any node whose `activeSelf`
 * is false. The caller must guarantee `root`'s parent chain is fully active.
 * @internal
 */
export function traverseActiveSelf(
	root: THREE.Object3D,
	cb: (node: THREE.Object3D) => void
) {
	const ext = getExtension(root);
	if (ext && !ext.activeSelf) return;
	cb(root);
	for (const c of root.children) traverseActiveSelf(c, cb);
}

function activateNode(node: THREE.Object3D) {
	const ext = getExtension(node);
	if (!ext) return;
	if (!ext.context) ext.resolveContext();
	for (const comp of ext.components) {
		if (!comp._ctx) comp._ctx = ext.context;
		if (comp.enabled && comp._ctx) comp._activate();
	}
}

function deactivateNode(node: THREE.Object3D) {
	const ext = getExtension(node);
	if (!ext) return;
	for (const comp of ext.components) {
		if (comp._isActive) comp._deactivate();
	}
}

function activateSubtree(root: THREE.Object3D) {
	// `root.activeSelf` was just set to true, so `traverseActiveSelf` will descend through it.
	traverseActiveSelf(root, activateNode);
}

function deactivateSubtree(root: THREE.Object3D) {
	// `root.activeSelf` was just set to false, so we process root explicitly,
	// then descend into each child via traverseActiveSelf (which prunes inactive subtrees).
	deactivateNode(root);
	for (const c of root.children) traverseActiveSelf(c, deactivateNode);
}
