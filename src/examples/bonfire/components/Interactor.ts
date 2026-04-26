import * as THREE from "three/webgpu";
import { Object3DBehaviour } from "@/core/Object3DBehaviour";
import { getComponent } from "@/core/methods";
import type { InputModule } from "../modules/InputModule";
import type { CrosshairModule } from "../modules/CrosshairModule";
import { Interactable } from "./Interactable";

/**
 * Lives on the player. Each frame:
 *   1. Casts a ray from camera forward.
 *   2. Picks the first hit; checks if its object (or any ancestor) carries an
 *      {@link Interactable}.
 *   3. If the hit is within `interactRange`, pushes a hint to the crosshair
 *      and — on E key down — fires `onInteract`.
 */
export class Interactor extends Object3DBehaviour {
	interactKey = "KeyE";

	private raycaster = new THREE.Raycaster();
	private origin = new THREE.Vector3();
	private dir = new THREE.Vector3();

	onUpdate() {
		const mods = this.modules as Record<string, unknown>;
		const input = mods.input as InputModule | undefined;
		const crosshair = mods.crosshair as CrosshairModule | undefined;
		if (!input || !crosshair) return;

		// Cast from camera position along its forward direction.
		const cam = this.ctx.camera;
		this.origin.copy(cam.position);
		cam.getWorldDirection(this.dir);
		this.raycaster.set(this.origin, this.dir);

		const hits = this.raycaster.intersectObjects(this.ctx.scene.children, true);
		const target = findInteractable(hits);
		if (!target) return;

		const { interactable, hit } = target;
		if (hit.distance > interactable.interactRange) return;

		crosshair.setHint(interactable.hint);

		if (input.wasJustPressed(this.interactKey)) {
			interactable.onInteract();
		}
	}
}

function findInteractable(
	hits: THREE.Intersection[]
): { interactable: Interactable; hit: THREE.Intersection } | null {
	for (const hit of hits) {
		let node: THREE.Object3D | null = hit.object;
		while (node) {
			const interactable = getComponent(node, Interactable);
			if (interactable) return { interactable, hit };
			node = node.parent;
		}
	}
	return null;
}
