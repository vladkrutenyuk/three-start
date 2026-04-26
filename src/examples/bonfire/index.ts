import * as THREE from "three/webgpu";
import { ThreeStart } from "@/core/ThreeStart";
import { addComponent } from "@/core/methods";

import { InputModule } from "./modules/InputModule";
import { CrosshairModule } from "./modules/CrosshairModule";
import { FirstPersonCameraControls } from "./components/FirstPersonCameraControls";
import { PlayerControl } from "./components/PlayerControl";
import { Interactor } from "./components/Interactor";
import { Bonfire } from "./components/Bonfire";

// NOTE: per-example registry augmentation is intentionally not used here —
// other examples in this repo augment `ThreeStartRegister.modules` differently
// and the interface is global. Components access modules via local casts.

export const starter = new ThreeStart({
	renderer: new THREE.WebGPURenderer({ antialias: true }),
}).addModules({
	// Cast — `ThreeStartRegister.modules` is augmented globally by other examples
	// (e.g. snake) for their own module shape; bonfire registers its own.
	input: new InputModule(),
	crosshair: new CrosshairModule(),
} as never);

const { scene } = starter.ctx;

// ── Environment ──────────────────────────────────────────────────────────────
scene.add(new THREE.HemisphereLight(0x88aaff, 0x222018, 0.6));
const sun = new THREE.DirectionalLight(0xffe9c2, 0.9);
sun.position.set(8, 14, 4);
scene.add(sun);

const ground = new THREE.Mesh(
	new THREE.PlaneGeometry(60, 60),
	new THREE.MeshStandardMaterial({ color: 0x2a2618, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// A few decorative rocks so the environment isn't empty.
const rockMat = new THREE.MeshStandardMaterial({ color: 0x555550, roughness: 1 });
for (let i = 0; i < 12; i++) {
	const r = 4 + Math.random() * 8;
	const a = Math.random() * Math.PI * 2;
	const rock = new THREE.Mesh(
		new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.4, 0),
		rockMat
	);
	rock.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r);
	rock.rotation.set(Math.random(), Math.random(), Math.random());
	scene.add(rock);
}

// ── Bonfire ──────────────────────────────────────────────────────────────────
const bonfire = new THREE.Object3D();
bonfire.position.set(0, 0, -3);
scene.add(bonfire);
addComponent(bonfire, Bonfire);

// A second bonfire to show interactor distance + hint switching.
const bonfire2 = new THREE.Object3D();
bonfire2.position.set(4, 0, -2);
scene.add(bonfire2);
addComponent(bonfire2, Bonfire);

// ── Player ───────────────────────────────────────────────────────────────────
const player = new THREE.Object3D();
player.position.set(0, 0, 2);
scene.add(player);
addComponent(player, FirstPersonCameraControls);
addComponent(player, PlayerControl);
addComponent(player, Interactor);

starter.start();
