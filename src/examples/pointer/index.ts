import * as THREE from "three/webgpu";
import {
  addComponent,
  ContextModule,
  Object3DBehaviour,
  ThreeStart,
} from "@/core";

// A ContextModule is a global system living on the context. It's registered
// once, before start(), and any component can read it via `this.modules`.
// Here: one module tracks the pointer on a ground plane; a chaser follows it.

class PointerModule extends ContextModule {
  readonly point = new THREE.Vector3();

  private readonly ndc = new THREE.Vector2();
  private readonly raycaster = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  onAwake() {
    window.addEventListener("pointermove", (e) => {
      this.ndc.set(
        (e.clientX / innerWidth) * 2 - 1,
        -(e.clientY / innerHeight) * 2 + 1,
      );
    });
  }

  // module onUpdate fires before any component's onUpdate
  onUpdate() {
    this.raycaster.setFromCamera(this.ndc, this.ctx.camera);
    this.raycaster.ray.intersectPlane(this.ground, this.point);
  }
}

// In your app, augment the registry once and `this.modules.pointer` is typed
// everywhere:
//
//   declare module "three-start" {
//     interface ThreeStartRegister {
//       modules: { pointer: PointerModule };
//     }
//   }
//
// (skipped here — all examples in this repo share one global registry)

class Chase extends Object3DBehaviour {
  private get pointer() {
    return this.modules.pointer as PointerModule;
  }

  onUpdate() {
    const dt = this.ctx.getDeltaTime();
    const target = this.pointer.point;
    const p = this.object.position;
    p.x = THREE.MathUtils.damp(p.x, target.x, 4, dt);
    p.z = THREE.MathUtils.damp(p.z, target.z, 4, dt);
    p.y = 0.55 + Math.sin(this.ctx.getTime() * 5) * 0.1;
    this.object.rotation.y += dt * 2.5;
  }
}

class MarkTarget extends Object3DBehaviour {
  onUpdate() {
    this.object.position.copy(this.pointerPoint);
    const k = (this.ctx.getTime() * 1.4) % 1;
    this.object.scale.setScalar(0.4 + k * 0.8);
    const mat = (this.object as THREE.Mesh).material as THREE.MeshBasicMaterial;
    mat.opacity = (1 - k) * 0.6;
  }

  private get pointerPoint() {
    return (this.modules.pointer as PointerModule).point;
  }
}

// --- scene ---

const starter = new ThreeStart().addModules({ pointer: new PointerModule() });

const { scene, camera } = starter.ctx;
scene.background = new THREE.Color(0x070907);
scene.fog = new THREE.Fog(0x070907, 8, 24);
camera.position.set(0, 6, 7.5);
camera.lookAt(0, 0, 0);

scene.add(new THREE.GridHelper(40, 80, 0x1d3a2a, 0x11221a));

const chaser = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.45),
  new THREE.MeshBasicMaterial({ color: 0x4ade80, wireframe: true }),
);
scene.add(chaser);
addComponent(chaser, Chase);

const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.55, 0.6, 48),
  new THREE.MeshBasicMaterial({
    color: 0x4ade80,
    transparent: true,
    side: THREE.DoubleSide,
  }),
);
marker.rotation.x = -Math.PI / 2;
scene.add(marker);
addComponent(marker, MarkTarget);

export default starter;
