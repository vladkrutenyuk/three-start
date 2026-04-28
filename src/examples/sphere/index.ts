import { ThreeStart } from "@/core/ThreeStart";
import * as THREE from "three/webgpu";

const starter = new ThreeStart({
	renderer: new THREE.WebGPURenderer({ antialias: true }),
});

const { camera, scene } = starter.ctx;

camera.position.set(10, 10, 10);
camera.lookAt(new THREE.Vector3());

const sphere = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshNormalMaterial());
scene.add(sphere);

export default starter;
