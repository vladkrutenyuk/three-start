import * as THREE from "three/webgpu";
import { addComponent, Object3DBehaviour, ThreeStart } from "@/core";

// Bootstrap: renderer, scene, camera, render loop, resize — one constructor.
const starter = new ThreeStart();

const { scene, camera } = starter.ctx;
scene.background = new THREE.Color(0x070907);
camera.position.set(0, 1.4, 4.4);
camera.lookAt(0, 0, 0);

const crystal = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.1),
  new THREE.MeshNormalMaterial({ flatShading: true }),
);
scene.add(crystal);

const shell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.6),
  new THREE.MeshBasicMaterial({
    color: 0x4ade80,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  }),
);
scene.add(shell);

// A component: extend Object3DBehaviour, override the event methods you need.
class Spin extends Object3DBehaviour {
  speed = 0.8;

  onUpdate() {
    const dt = this.ctx.getDeltaTime();
    this.object.rotation.y += this.speed * dt;
    this.object.rotation.x += this.speed * 0.35 * dt;
  }
}

// Attach it — the component wires itself into the render loop.
addComponent(crystal, Spin);

// addComponent returns the instance, so it can be configured in place.
addComponent(shell, Spin).speed = -0.25;

export default starter;
