import * as THREE from "three/webgpu";
import {
  addComponent,
  destroy,
  getComponent,
  Object3DBehaviour,
  ThreeStart,
} from "@/core";

// A component's full lifecycle, driven on a timer:
//   addComponent → onAwake → onEnable → onStart → onUpdate…
//   disable()    → onDisable
//   enable()     → onEnable
//   destroy()    → onDisable → onDestroy
// The label below the scene logs every event method as it fires.

const starter = new ThreeStart();

const { scene, camera } = starter.ctx;
scene.background = new THREE.Color(0x070907);
camera.position.set(0, 1, 4.6);
camera.lookAt(0, 0, 0);

const orb = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.05, 1),
  new THREE.MeshBasicMaterial({ color: 0x3a4440, wireframe: true }),
);
scene.add(orb);

// --- a tiny on-page log (plain DOM, nothing three-start specific) ---
const callLine = document.createElement("div");
const firedLine = document.createElement("div");
const hud = document.createElement("div");
hud.style.cssText =
  "position:fixed;left:50%;bottom:30px;transform:translateX(-50%);" +
  "font:12px/1.9 ui-monospace,Menlo,monospace;letter-spacing:.06em;" +
  "text-align:center;white-space:pre;pointer-events:none";
callLine.style.color = "#e6e4dc";
firedLine.style.color = "#4ade80";
hud.append(callLine, firedLine);
document.body.appendChild(hud);

const fired = (name: string) => {
  firedLine.textContent = `${firedLine.textContent} ${name}`.trimStart();
};

// --- the component under observation ---
class Glow extends Object3DBehaviour {
  private get mat() {
    return (this.object as THREE.Mesh).material as THREE.MeshBasicMaterial;
  }

  onAwake() {
    fired("onAwake");
  }

  onEnable() {
    this.mat.color.set(0x4ade80);
    fired("→ onEnable");
  }

  onStart() {
    fired("→ onStart");
  }

  onUpdate() {
    const t = this.ctx.getTime();
    this.object.rotation.y += this.ctx.getDeltaTime() * 0.9;
    this.object.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
  }

  onDisable() {
    this.mat.color.set(0xf0b429);
    fired("onDisable");
  }

  onDestroy() {
    this.mat.color.set(0x3a4440);
    this.object.scale.setScalar(1);
    fired("→ onDestroy");
  }
}

// --- the script driving it, one step every 1.6 s ---
const steps: [string, () => void][] = [
  ["addComponent(orb, Glow)", () => addComponent(orb, Glow)],
  [
    "getComponent(orb, Glow).disable()",
    () => getComponent(orb, Glow)?.disable(),
  ],
  ["getComponent(orb, Glow).enable()", () => getComponent(orb, Glow)?.enable()],
  [
    "destroy(getComponent(orb, Glow))",
    () => {
      const glow = getComponent(orb, Glow);
      if (glow) destroy(glow);
    },
  ],
];

let step = 0;
setInterval(() => {
  const [label, run] = steps[step % steps.length];
  callLine.textContent = `> ${label}`;
  firedLine.textContent = "";
  run();
  step++;
}, 1600);

export default starter;
