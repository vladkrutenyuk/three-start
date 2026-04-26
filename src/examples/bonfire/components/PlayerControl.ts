import * as THREE from "three/webgpu";
import { Object3DBehaviour } from "@/core/Object3DBehaviour";
import type { InputModule } from "../modules/InputModule";

/**
 * WASD movement on the XZ plane, relative to the camera's facing direction.
 * Y is locked to 0 — the player's "feet" stay on the ground; the FPS camera
 * rig (`FirstPersonCameraControls`) handles eye height.
 */
export class PlayerControl extends Object3DBehaviour {
	speed = 4;

	// reusable scratch — never allocate inside onUpdate
	private forward = new THREE.Vector3();
	private right = new THREE.Vector3();
	private move = new THREE.Vector3();
	private up = new THREE.Vector3(0, 1, 0);

	onUpdate() {
		const input = (this.modules as Record<string, unknown>)
			.input as InputModule;
		if (!input) return;

		// Camera forward in world, projected onto XZ.
		this.ctx.camera.getWorldDirection(this.forward);
		this.forward.y = 0;
		this.forward.normalize();
		this.right.crossVectors(this.forward, this.up).normalize();

		this.move.set(0, 0, 0);
		if (input.isPressed("KeyW")) this.move.add(this.forward);
		if (input.isPressed("KeyS")) this.move.sub(this.forward);
		if (input.isPressed("KeyD")) this.move.add(this.right);
		if (input.isPressed("KeyA")) this.move.sub(this.right);

		if (this.move.lengthSq() === 0) return;

		this.move.normalize().multiplyScalar(this.speed * this.ctx.getDeltaTime());
		this.object.position.add(this.move);
		this.object.position.y = 0;
	}
}
