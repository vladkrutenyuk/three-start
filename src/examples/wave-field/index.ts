import * as THREE from "three/webgpu";
import { addComponent, Object3DBehaviour, ThreeStart } from "@/core";

// One component class, hundreds of instances. Extra addComponent arguments
// are forwarded to the component's constructor — fully typed.

const starter = new ThreeStart();

const { scene, camera } = starter.ctx;
scene.background = new THREE.Color(0x070907);
scene.fog = new THREE.Fog(0x070907, 10, 26);
camera.position.set(0, 7, 11);
camera.lookAt(0, -0.5, 0);

class Wave extends Object3DBehaviour {
  constructor(private readonly phase: number) {
    super();
  }

  onUpdate() {
    const t = this.ctx.getTime() * 2.2 - this.phase;
    this.object.position.y = Math.sin(t) * 0.45;
    this.object.scale.y = 1.6 + Math.sin(t) * 1.1;
  }
}

const N = 18;
const SPACING = 0.62;
const geometry = new THREE.BoxGeometry(0.34, 0.34, 0.34);
const material = new THREE.MeshNormalMaterial();

for (let i = 0; i < N; i++) {
  for (let j = 0; j < N; j++) {
    const box = new THREE.Mesh(geometry, material);
    box.position.set(
      (i - (N - 1) / 2) * SPACING,
      0,
      (j - (N - 1) / 2) * SPACING,
    );
    scene.add(box);

    // ripple: phase grows with distance from the center of the grid
    const phase = Math.hypot(i - (N - 1) / 2, j - (N - 1) / 2) * 0.55;
    addComponent(box, Wave, phase);
  }
}

export default starter;
