import * as THREE from "three/webgpu";
import CameraControls from "camera-controls";
import { Object3DBehaviour } from "@/core/Object3DBehaviour";

// Subset of THREE that camera-controls needs. Done once per process.
let installed = false;
function ensureInstalled() {
	if (installed) return;
	CameraControls.install({ THREE });
	installed = true;
}

/**
 * First-person camera rig driven by `camera-controls`.
 *
 * - Camera-controls' `distance` is pinned to ~0 so the camera sits ON the
 *   target (not orbiting around it) — i.e. a true first-person rig.
 * - Each frame the target is snapped to the host object's position + eye
 *   height, so the camera follows the player.
 * - Click-to-lock pointer; ESC unlocks. While locked, mouse drives rotation.
 */
export class FirstPersonCameraControls extends Object3DBehaviour {
	eyeHeight = 1.7;

	private controls!: CameraControls;
	private eye = new THREE.Vector3();

	onAwake() {
		ensureInstalled();
		const dom = this.ctx.canvasContainer ?? this.ctx.renderer.domElement;
		this.controls = new CameraControls(this.ctx.camera, dom as HTMLElement);

		// Pin distance to (effectively) zero: camera === target.
		this.controls.minDistance = 0.001;
		this.controls.maxDistance = 0.001;
		this.controls.distance = 0.001;

		// Don't let dragging change distance / pan.
		this.controls.dollySpeed = 0;
		this.controls.truckSpeed = 0;

		// Initial look — eye at host + eyeHeight, looking forward (-Z).
		this.eye.copy(this.object.position).y += this.eyeHeight;
		this.controls.setLookAt(
			this.eye.x,
			this.eye.y,
			this.eye.z,
			this.eye.x,
			this.eye.y,
			this.eye.z - 1,
			false
		);

		// Click on canvas to capture pointer; ESC unlocks (browser-native).
		dom.addEventListener("pointerdown", this.onPointerDown);
	}

	onUpdate() {
		// Keep the controls' target snapped to the host's eye position.
		this.eye.set(
			this.object.position.x,
			this.object.position.y + this.eyeHeight,
			this.object.position.z
		);
		this.controls.moveTo(this.eye.x, this.eye.y, this.eye.z, false);
		this.controls.update(this.ctx.getDeltaTime());
	}

	onDestroy() {
		const dom = this.ctx.canvasContainer ?? this.ctx.renderer.domElement;
		dom.removeEventListener("pointerdown", this.onPointerDown);
		this.controls.dispose();
	}

	private onPointerDown = () => {
		this.controls.lockPointer();
	};
}
