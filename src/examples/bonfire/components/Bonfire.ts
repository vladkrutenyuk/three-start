import * as THREE from "three/webgpu";
import { Object3DBehaviour } from "@/core/Object3DBehaviour";
import { addComponent, getComponent } from "@/core/methods";
import { FireEffect } from "./FireEffect";
import { Interactable } from "./Interactable";

const LOG_MATERIAL = new THREE.MeshStandardMaterial({
	color: 0x4a2f1a,
	roughness: 1,
});
const LOG_GEOMETRY = new THREE.CylinderGeometry(0.07, 0.07, 1, 10);

/**
 * Builds a primitive bonfire: a stack of crossed log meshes plus a child
 * {@link FireEffect}. Wires up an {@link Interactable} so pressing the
 * interaction key (E) toggles the fire on/off.
 */
export class Bonfire extends Object3DBehaviour {
	private fireHost: THREE.Object3D | null = null;
	private isLit = false;

	onAwake() {
		this.buildLogs();
		this.spawnFire();
		this.wireInteractable();
	}

	private buildLogs() {
		// 4 logs in a ring, tipped inwards into a tepee — simple but readable.
		const ring = new THREE.Group();
		const radius = 0.35;
		for (let i = 0; i < 6; i++) {
			const angle = (i / 6) * Math.PI * 2;
			const log = new THREE.Mesh(LOG_GEOMETRY, LOG_MATERIAL);
			log.position.set(Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius);
			// Tip the top inward toward the centre.
			log.rotation.z = Math.cos(angle) * -0.45;
			log.rotation.x = Math.sin(angle) * 0.45;
			ring.add(log);
		}
		// A flat "ash" disc under the logs.
		const ash = new THREE.Mesh(
			new THREE.CircleGeometry(0.55, 24),
			new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 1 })
		);
		ash.rotation.x = -Math.PI / 2;
		ash.position.y = 0.001;
		this.object.add(ash);
		this.object.add(ring);
	}

	private spawnFire() {
		const fireHost = new THREE.Object3D();
		fireHost.position.y = 0.4; // emitter sits inside the log pile
		this.object.add(fireHost);
		addComponent(fireHost, FireEffect);
		// Start unlit — FireEffect has no enabled-by-default fire visible
		// because we paused the emitter inside it. Disable the component too
		// so its onUpdate doesn't run while unlit.
		const fx = getComponent(fireHost, FireEffect);
		fx?.disable();
		this.fireHost = fireHost;
	}

	private wireInteractable() {
		const interactable = addComponent(this.object, Interactable);
		interactable.hint = "press [E] to light";
		interactable.interactRange = 3;
		interactable.onInteract = () => this.toggle();
	}

	toggle() {
		if (!this.fireHost) return;
		const fx = getComponent(this.fireHost, FireEffect);
		if (!fx) return;
		this.isLit = !this.isLit;
		if (this.isLit) fx.enable();
		else fx.disable();

		// Update interactable hint to match new state.
		const interactable = getComponent(this.object, Interactable);
		if (interactable) {
			interactable.hint = this.isLit
				? "press [E] to extinguish"
				: "press [E] to light";
		}
	}
}
