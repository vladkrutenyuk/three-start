import type * as THREE from "three";
import type { Object3DBehaviourConstructor } from "./Object3DBehaviour";
import { Object3DBehaviour } from "./Object3DBehaviour";
import { ensureExtension, getExtension, isActiveInHierarchy } from "./Object3DExtension";
import type { ThreeContext, ThreeStartCamera, ThreeStartScenes } from "./ThreeContext";
import { _starterFor } from "./ThreeStart";

/**
 * Activate or deactivate an Object3D and cascade the change through every descendant
 * whose own active flag is `true`. When the effective state flips off, every component
 * in the affected subtree receives `onDisable`; when it flips on, enabled components
 * fire `onEnable` (and `onAwake` / `onStart` on their first activation).
 *
 * The object's own flag is what gets set (`activeSelf`). Whether components
 * actually run depends on the full chain (`activeInHierarchy`).
 */
export function setActive(obj: THREE.Object3D, active: boolean) {
	ensureExtension(obj).setActive(active);
}

/**
 * Whether `obj` is effectively active: its own active flag AND every ancestor's
 * active flag are all `true` (`activeInHierarchy`). Objects and ancestors
 * without an extension (i.e. ones never touched by three-start) count as active.
 */
export function getIsActive(obj: THREE.Object3D): boolean {
	return isActiveInHierarchy(obj);
}

/**
 * The object's own active flag (`activeSelf`) — the value last passed to
 * `setActive(obj, ...)`, regardless of any ancestor's state. Defaults to
 * `true` for objects never touched by three-start.
 */
export function getIsActiveSelf(obj: THREE.Object3D): boolean {
	const ext = getExtension(obj);
	return ext ? ext.activeSelf : true;
}

/**
 * Instantiate a component and attach it to the given Object3D.
 * Extra arguments are forwarded to the component's constructor, with types inferred from it.
 * If context is available and object is active, the full lifecycle fires immediately.
 * Otherwise it will fire when the object joins a hierarchy with context (via ThreeStart).
 */
export function addComponent<T extends Object3DBehaviour, TArgs extends any[]>(
	obj: THREE.Object3D,
	klass: Object3DBehaviourConstructor<T, TArgs>,
	...args: TArgs
): T {
	return ensureExtension(obj).addComponent(klass, ...args);
}

/**
 * Find the first component of the given class on the object.
 */
export function getComponent<T extends Object3DBehaviour>(
	obj: THREE.Object3D,
	klass: Object3DBehaviourConstructor<T>
): T | null {
	const ext = getExtension(obj);
	if (!ext) return null;
	return (ext.components.find((c) => c instanceof klass) as T | undefined) ?? null;
}

/**
 * Get all components (optionally filtered by class) on the object.
 */
export function getComponents(obj: THREE.Object3D): Object3DBehaviour[];
export function getComponents<T extends Object3DBehaviour>(
	obj: THREE.Object3D,
	klass: Object3DBehaviourConstructor<T>
): T[];
export function getComponents<T extends Object3DBehaviour>(
	obj: THREE.Object3D,
	klass?: Object3DBehaviourConstructor<T>
): Object3DBehaviour[] | T[] {
	const ext = getExtension(obj);
	if (!ext) return [];
	if (!klass) return [...ext.components];
	return ext.components.filter((c) => c instanceof klass) as T[];
}

/**
 * Destroy a component or an entire Object3D (with all its components).
 */
export function destroy(target: THREE.Object3D | Object3DBehaviour) {
	if (target instanceof Object3DBehaviour) {
		const ext = target._ext;
		if (ext) {
			ext.destroyComponent(target);
		} else {
			target._destroy();
		}
	} else {
		target.traverse((node) => {
			getExtension(node)?.destroyAllComponents();
		});
		target.removeFromParent();
	}
}

/**
 * Register a named `THREE.Scene` on `ctx`. The constructor scene is already
 * `scenes.Default`. Omitted `scene` creates an empty one; omitted `camera`
 * creates a `PerspectiveCamera` and adds it to the scene when it has no parent.
 *
 * Duplicate names throw. A scene or camera that is already registered under
 * another name warns and returns the existing scene. The new scene is not shown
 * until [`setScene`](/docs/api/operations).
 */
export function addScene(
	ctx: ThreeContext,
	name: keyof ThreeStartScenes & string,
	scene?: THREE.Scene,
	camera?: ThreeStartCamera
): THREE.Scene {
	return _starterFor(ctx)._addScene(name, scene, camera);
}

/**
 * Make `ctx.scenes[name]` the scene [`ctx.scene`](/docs/api/three-context) /
 * [`ctx.camera`](/docs/api/three-context) point at, and the one the renderer draws.
 * Same scene is a no-op. An unknown name throws.
 *
 * Components on the previous scene receive `onDisable` and pause; components on the
 * new scene resume (`onEnable`) or, the first time after `start()`, run the full
 * bootstrap. [`ContextModule`](/docs/api/context-module)s keep running.
 */
export function setScene(
	ctx: ThreeContext,
	name: keyof ThreeStartScenes & string
): void {
	_starterFor(ctx)._setScene(name);
}
