import { addComponent, destroy, getComponent } from "@/core/methods";
import { Object3DBehaviour } from "@/core/Object3DBehaviour";
import { ThreeStart } from "@/core/ThreeStart";
import * as THREE from "three/webgpu";

export const starter = new ThreeStart({
	renderer: new THREE.WebGPURenderer({ antialias: true }),
});

const { camera, scene } = starter.ctx;

camera.position.set(10, 10, 10);
camera.lookAt(new THREE.Vector3());

const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
scene.add(cube);

class Spin extends Object3DBehaviour {
	onAwake(): void {
		this.color("pink");
	}
	onEnable(): void {
		this.color("green");
	}
	onDisable(): void {
		this.color("red");
	}

	onUpdate(): void {
		const dt = this.ctx.getDeltaTime();
		this.object.rotation.y += dt;
	}

	onDestroy(): void {
		this.color("black");
	}

	color(value: THREE.ColorRepresentation) {
		((this.object as THREE.Mesh).material as THREE.MeshBasicMaterial).color =
			new THREE.Color(value);
	}
}

setInterval(() => {
	const c = getComponent(cube, Spin);
	if (c) {
		if (!c.enabled) {
			c.enable();
			return;
		}
		if (Math.random() > 0.5) {
			destroy(c);
		} else {
			c.disable();
		}
	} else {
		addComponent(cube, Spin);
	}
}, 1000);
