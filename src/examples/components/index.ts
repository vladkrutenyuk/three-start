import * as THREE from "three/webgpu";
import { addComponent, Object3DBehaviour, ThreeStart } from "@/core";

// One object, three independent components. Each does a single thing;
// together they compose — no inheritance chains, no god update loop.

const starter = new ThreeStart();

const { scene, camera } = starter.ctx;
scene.background = new THREE.Color(0x070907);
scene.fog = new THREE.Fog(0x070907, 6, 16);
camera.position.set(0, 1.6, 5);
camera.lookAt(0, 0.4, 0);

const grid = new THREE.GridHelper(30, 60, 0x1d3a2a, 0x11221a);
grid.position.y = -1.2;
scene.add(grid);

const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.8, 0.26, 140, 20),
  new THREE.MeshNormalMaterial(),
);
scene.add(knot);

class Spin extends Object3DBehaviour {
  onUpdate() {
    this.object.rotation.y += 0.5 * this.ctx.getDeltaTime();
  }
}

class Bob extends Object3DBehaviour {
  private baseY = 0;

  onAwake() {
    this.baseY = this.object.position.y;
  }

  onUpdate() {
    const t = this.ctx.getTime();
    this.object.position.y = this.baseY + Math.sin(t * 1.6) * 0.3;
  }
}

class Breathe extends Object3DBehaviour {
  onUpdate() {
    const s = 1 + Math.sin(this.ctx.getTime() * 3.1) * 0.07;
    this.object.scale.setScalar(s);
  }
}

addComponent(knot, Spin);
addComponent(knot, Bob);
addComponent(knot, Breathe);

export default starter;
