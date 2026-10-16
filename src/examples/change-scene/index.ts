import * as THREE from "three/webgpu";
import {
	addComponent,
	addScene,
	Object3DBehaviour,
	setScene,
	ThreeStart,
	ThreeContextEvents,
} from "@/core";

// A component: extend Object3DBehaviour, override the event methods you need.
class Spin extends Object3DBehaviour {
  speed = 0.8;

  onUpdate() {
    const dt = this.ctx.getDeltaTime();
    this.object.rotation.x += this.speed * 0.35 * dt;
    this.object.rotation.z += this.speed * 0.62 * dt;
  }
}

// Bootstrap: renderer, scene, camera, render loop, resize — one constructor.
const starter = new ThreeStart();
const { ctx } = starter;

const { scene, camera } = ctx;
scene.name = "Scene A";
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

// Attach it — the component wires itself into the render loop.
addComponent(crystal, Spin);

// addComponent returns the instance, so it can be configured in place.
addComponent(shell, Spin).speed = -0.25;

// Scene B
const sceneB = new THREE.Scene();
sceneB.name = "Scene B";
addScene(ctx, "Scene B", sceneB, camera.clone());

const capsuleB = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.5, 0.85, 12, 16),
  new THREE.MeshNormalMaterial(),
)
addComponent(capsuleB, Spin);
sceneB.add(capsuleB);

// Scene C
const sceneC = new THREE.Scene();
sceneC.name = "Scene C";

const torusC = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.5, 0.2, 128, 64),
  new THREE.MeshNormalMaterial(),
)
addComponent(torusC, Spin);
sceneC.add(torusC);

addScene(ctx, "Scene C", sceneC, camera.clone());

starter.ctx.once(ThreeContextEvents.Mount, () => {
  document.body.addEventListener("click", () => {
    const names = Object.keys(starter.scenes);
    const currIndex = names.findIndex((n) => starter.scenes[n] === starter.ctx.scene);
    const nextIndex = (currIndex + 1) % names.length;
    setScene(ctx, names[nextIndex]);
  })
})

starter.ctx.on(ThreeContextEvents.SceneChanged, (next, prev) => {
  console.log(`Changed from ${prev.name} to ${next.name}`)
})

export default starter;
