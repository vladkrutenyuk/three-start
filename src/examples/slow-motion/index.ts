import * as THREE from "three/webgpu";
import {
  addComponent,
  ContextModule,
  Object3DBehaviour,
  ThreeStart,
} from "@/core";

// Every component reads time from the shared context timer — so scaling it
// scales the whole world at once. Hold the pointer down for slow motion.

class TimeDialModule extends ContextModule {
  target = 1;
  private current = 1;

  onAwake() {
    window.addEventListener("pointerdown", () => {
      this.target = 0.08;
    });
    window.addEventListener("pointerup", () => {
      this.target = 1;
    });
  }

  onUpdate() {
    // ease using unscaled wall-clock-ish steps so the dial itself stays snappy
    this.current += (this.target - this.current) * 0.08;
    this.ctx.setTimescale(this.current);
  }
}

class Spin extends Object3DBehaviour {
  constructor(
    private readonly axis: THREE.Vector3,
    private readonly speed: number,
  ) {
    super();
  }

  onUpdate() {
    this.object.rotateOnAxis(this.axis, this.speed * this.ctx.getDeltaTime());
  }
}

class Swarm extends Object3DBehaviour {
  constructor(
    private readonly phase: number,
    private readonly radius: number,
  ) {
    super();
  }

  onUpdate() {
    const t = this.ctx.getTime() * 1.7 + this.phase;
    this.object.position.set(
      Math.cos(t) * this.radius,
      Math.sin(t * 1.3) * 1.2,
      Math.sin(t) * this.radius,
    );
  }
}

// --- scene: a gyroscope of nested rings + a swarm of sparks ---

const starter = new ThreeStart().addModules({ timeDial: new TimeDialModule() });

const { scene, camera } = starter.ctx;
scene.background = new THREE.Color(0x070907);
camera.position.set(0, 1.6, 5.6);
camera.lookAt(0, 0, 0);

const ringMat = (color: number) =>
  new THREE.MeshBasicMaterial({ color, wireframe: true });

const RINGS = [
  { radius: 1.9, axis: new THREE.Vector3(1, 0, 0), color: 0x4ade80 },
  { radius: 1.45, axis: new THREE.Vector3(0, 1, 0.3), color: 0xd8e0d8 },
  { radius: 1.0, axis: new THREE.Vector3(0.5, 0.2, 1), color: 0x4ade80 },
];

for (const [i, { radius, axis, color }] of RINGS.entries()) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.035, 10, 90),
    ringMat(color),
  );
  scene.add(ring);
  addComponent(ring, Spin, axis.normalize(), 1.2 + i * 0.6);
}

const core = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.4, 0),
  ringMat(0xd8e0d8),
);
scene.add(core);
addComponent(core, Spin, new THREE.Vector3(0, 1, 0), 3);

for (let i = 0; i < 14; i++) {
  const spark = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.07),
    ringMat(0x4ade80),
  );
  scene.add(spark);
  addComponent(spark, Swarm, (i / 14) * Math.PI * 2, 2.4 + (i % 3) * 0.25);
}

// --- hint ---
const hint = document.createElement("div");
hint.style.cssText =
  "position:fixed;left:50%;bottom:30px;transform:translateX(-50%);" +
  "font:12px/1.6 ui-monospace,Menlo,monospace;letter-spacing:.08em;" +
  "color:#4ade80;pointer-events:none";
hint.textContent = "> hold pointer — ctx.setTimescale(0.08)";
document.body.appendChild(hint);

export default starter;
