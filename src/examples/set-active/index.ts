import * as THREE from "three/webgpu";
import {
  addComponent,
  getIsActive,
  Object3DBehaviour,
  setActive,
  ThreeStart,
} from "@/core";

// setActive(obj, false) deactivates an object and its whole subtree: every
// component on it fires onDisable and leaves the render loop. The reverse
// call brings everything back exactly where it stopped. Click to toggle.

const starter = new ThreeStart();

const { scene, camera } = starter.ctx;
scene.background = new THREE.Color(0x070907);
camera.position.set(0, 3.4, 6.4);
camera.lookAt(0, 0, 0);

class Orbit extends Object3DBehaviour {
  constructor(private readonly speed: number) {
    super();
  }

  onUpdate() {
    this.object.rotation.y += this.speed * this.ctx.getDeltaTime();
  }
}

class Pulse extends Object3DBehaviour {
  private get mat() {
    return (this.object as THREE.Mesh).material as THREE.MeshBasicMaterial;
  }

  onEnable() {
    this.mat.color.set(0x4ade80); // running → green
  }

  onUpdate() {
    this.object.scale.setScalar(1 + Math.sin(this.ctx.getTime() * 4) * 0.18);
  }

  onDisable() {
    this.mat.color.set(0x59615b); // deactivated → gray
  }
}

// everything below lives in ONE group — the single setActive target
const mobile = new THREE.Group();
scene.add(mobile);

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.7, 1),
  new THREE.MeshBasicMaterial({ color: 0x4ade80, wireframe: true }),
);
mobile.add(core);
addComponent(core, Pulse);

for (let i = 0; i < 6; i++) {
  const pivot = new THREE.Object3D();
  pivot.rotation.y = (i / 6) * Math.PI * 2;
  mobile.add(pivot);
  addComponent(pivot, Orbit, 0.5 + i * 0.22);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshBasicMaterial({ color: 0x4ade80, wireframe: true }),
  );
  cube.position.set(1.6 + i * 0.34, Math.sin(i * 2.4) * 0.7, 0);
  pivot.add(cube);
  addComponent(cube, Pulse);
}

// --- toggle the whole subtree on click ---
const hint = document.createElement("div");
hint.style.cssText =
  "position:fixed;left:50%;bottom:30px;transform:translateX(-50%);" +
  "font:12px/1.6 ui-monospace,Menlo,monospace;letter-spacing:.08em;" +
  "color:#4ade80;pointer-events:none;white-space:pre";
document.body.appendChild(hint);

const updateHint = () => {
  hint.textContent = `> setActive(mobile, ${!getIsActive(mobile)})   — click anywhere`;
};
updateHint();

window.addEventListener("pointerdown", () => {
  setActive(mobile, !getIsActive(mobile));
  updateHint();
});

export default starter;
