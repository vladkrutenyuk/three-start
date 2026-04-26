import type * as THREE from "three";
import { Object3DBehaviour } from "./Object3DBehaviour";
import type { Object3DBehaviourConstructor } from "./Object3DBehaviour";
import {
	ensureExtension,
	getExtension,
	attachContext,
	isActiveInHierarchy,
} from "./Object3DExtension";

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
 * If context is available and object is active, the full lifecycle fires immediately.
 * Otherwise it will fire when the object joins a hierarchy with context (via ThreeStart).
 */
export function addComponent<T extends Object3DBehaviour>(
	obj: THREE.Object3D,
	klass: Object3DBehaviourConstructor<T>
): T {
	return ensureExtension(obj).addComponent(klass);
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

export { attachContext };
