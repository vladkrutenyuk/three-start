import { addComponent } from "@/core/methods";
import { Object3DBehaviour } from "@/core/Object3DBehaviour";
import { ThreeStart } from "@/core/ThreeStart";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
	fract,
	range,
	rotateUV,
	texture,
	time,
	uniform,
	uv,
	vec3,
	vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { createSmokeTexture } from "./smoke-texture";

const SMOKE_TEXTURE = createSmokeTexture();

class ParticlesDemoApp extends ThreeStart {
	constructor() {
		super({
			renderer: new THREE.WebGPURenderer({ antialias: true }),
		});
		this.setupScene();
	}

	setupScene() {
		const { camera, scene, renderer } = this.ctx;

		camera.fov = 60;
		camera.near = 1;
		camera.far = 5000;
		camera.position.set(1300, 500, 0);
		camera.updateProjectionMatrix();

		scene.background = new THREE.Color(0x333333);

		const grid = new THREE.GridHelper(3000, 40, 0x444444, 0x444444);
		grid.position.y = -75;
		scene.add(grid);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.maxDistance = 2700;
		controls.target.set(0, 500, 0);
		controls.update();

		scene.add(addComponent(new THREE.Object3D(), FireParticles, 0.2).object);
	}
}

class FireParticles extends Object3DBehaviour {
	constructor(readonly speed: number) {
		super();
	}
	onAwake(): void {
		const lifeRange = range(0.1, 1);
		const offsetRange = range(
			new THREE.Vector3(-2, 3, -2),
			new THREE.Vector3(2, 5, 2)
		);

		const speed = uniform(this.speed);
		const scaledTime = time.add(5).mul(speed);

		const lifeTime = scaledTime.mul(lifeRange).mod(1);
		const scaleRange = range(0.3, 1);
		const rotateRange = range(0.1, 4);

		const life = lifeTime.div(lifeRange);

		// const fakeLightEffect = positionLocal.y.oneMinus().max(0.2);

		const textureNode = texture(
			SMOKE_TEXTURE,
			rotateUV(uv(), scaledTime.mul(rotateRange))
		);
		const opacityNode = textureNode.a.mul(life.oneMinus());

		const fireMaterial = new THREE.SpriteNodeMaterial();
		fireMaterial.colorNode = vec4(vec3(fract(lifeTime)), 1);
		fireMaterial.positionNode = range(
			new THREE.Vector3(-1, 1, -1),
			new THREE.Vector3(1, 2, 1)
		)
			.mul(lifeTime)
			.mul(10);
		// fireMaterial.scaleNode = scaleRange.oneMinus().mul(lifeTime);
		// fireMaterial.opacityNode = lifeTime.oneMinus();
		// fireMaterial.blending = THREE.AdditiveBlending;
		fireMaterial.transparent = false;
		fireMaterial.depthWrite = false;

		const fireSprite = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fireMaterial);
		fireSprite.scale.setScalar(40);
		fireSprite.count = 100;
		fireSprite.position.y = -100;
		fireSprite.renderOrder = 1;
		this.object.add(fireSprite);
	}
}

const app = new ParticlesDemoApp();

export default app;
