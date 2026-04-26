import { Object3DBehaviour } from "@/core/Object3DBehaviour";
import { addComponent, destroy } from "@/core/methods";
import * as THREE from "three/webgpu";

export class PlayerController extends Object3DBehaviour {
	speed = 8;
	private _moveDir = new THREE.Vector3(0, 0, -1);

	onEnable() {
		this._moveDir.set(0, 0, -1);
	}

	onUpdate() {
		const dt = this.ctx.getDeltaTime();
		const { dir } = this.modules.input;
		if (dir.lengthSq() > 0) this._moveDir.copy(dir);

		this.object.position.addScaledVector(this._moveDir, this.speed * dt);

		const p = this.object.position;
		p.x = THREE.MathUtils.clamp(p.x, -14, 14);
		p.z = THREE.MathUtils.clamp(p.z, -14, 14);
	}
}

export class CameraFollow extends Object3DBehaviour {
	target: THREE.Object3D | null = null;
	offset = new THREE.Vector3(0, 12, 10);
	damping = 5;
	private _desired = new THREE.Vector3();

	onUpdate() {
		if (!this.target) return;
		const dt = this.ctx.getDeltaTime();
		this._desired.copy(this.target.position).add(this.offset);
		this.object.position.lerp(this._desired, 1 - Math.exp(-this.damping * dt));
		this.object.lookAt(this.target.position);
	}
}

export class Spin extends Object3DBehaviour {
	speed = new THREE.Vector3(0, 2, 0);

	onUpdate() {
		const dt = this.ctx.getDeltaTime();
		this.object.rotation.x += this.speed.x * dt;
		this.object.rotation.y += this.speed.y * dt;
		this.object.rotation.z += this.speed.z * dt;
	}
}

export class Bobbing extends Object3DBehaviour {
	amplitude = 0.3;
	frequency = 2;
	private _baseY = 0;

	onAwake() {
		this._baseY = this.object.position.y;
	}

	onUpdate() {
		const time = this.ctx.getTime();
		this.object.position.y =
			this._baseY +
			Math.sin(time * this.frequency + this.object.position.x) * this.amplitude;
	}
}

export class Pulse extends Object3DBehaviour {
	speed = 4;
	min = 0.9;
	max = 1.1;

	onUpdate() {
		const time = this.ctx.getTime();
		const s = THREE.MathUtils.lerp(
			this.min,
			this.max,
			(Math.sin(time * this.speed) + 1) / 2
		);
		this.object.scale.setScalar(s);
	}
}

export class TrailSegment extends Object3DBehaviour {
	target: THREE.Object3D | null = null;
	damping = 5;
	grace = 1.5;

	onUpdate() {
		if (this.grace > 0) this.grace -= this.ctx.getDeltaTime();
		if (!this.target) return;
		const dt = this.ctx.getDeltaTime();
		this.object.position.lerp(
			this.target.position,
			1 - Math.exp(-this.damping * dt)
		);
	}
}

/**
 * Flashes the object on/off for `duration` seconds, then restores visibility
 * and calls `onEnd`. Self-removes when done — just `addComponent` it.
 */
export class InvulnerabilityFlash extends Object3DBehaviour {
	duration = 1.5;
	frequency = 25;
	onEnd: (() => void) | null = null;
	private _timer = 0;

	onStart() {
		this._timer = this.duration;
	}

	onUpdate() {
		this._timer -= this.ctx.getDeltaTime();
		this.object.visible = Math.sin(this.ctx.getTime() * this.frequency) > 0;
		if (this._timer <= 0) {
			this.onEnd?.();
			destroy(this);
		}
	}

	onDestroy() {
		// Restore visibility regardless of how this component is removed.
		this.object.visible = true;
	}
}

/**
 * One-shot burst of particles that fires on the first frame and self-destructs
 * the host object. Usage:
 *
 * ```ts
 * const host = new THREE.Object3D();
 * host.position.copy(pos);
 * this.ctx.scene.add(host);
 * const burst = addComponent(host, BurstEffect);
 * burst.geometry = geo;
 * burst.material = mat;
 * ```
 */
export class BurstEffect extends Object3DBehaviour {
	static readonly geo = new THREE.SphereGeometry(0.08);
	static readonly mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
	static readonly matDamage = new THREE.MeshBasicMaterial({ color: 0xff0044 });

	count = 6;
	speed = 4;
	material: THREE.Material = BurstEffect.mat;

	onStart() {
		const pos = this.object.position;
		const scene = this.ctx.scene;
		for (let i = 0; i < this.count; i++) {
			const mesh = new THREE.Mesh(BurstEffect.geo, this.material);
			mesh.position.copy(pos);
			scene.add(mesh);
			const angle = (i / this.count) * Math.PI * 2;
			addComponent(mesh, BurstParticle).direction.set(
				Math.cos(angle) * this.speed,
				2,
				Math.sin(angle) * this.speed
			);
		}
		// No onUpdate override → _subscribe() is a no-op → safe to destroy from onStart.
		destroy(this.object);
	}
}

export class BurstParticle extends Object3DBehaviour {
	direction = new THREE.Vector3();
	lifetime = 0.5;
	private _life = 0;

	onUpdate() {
		const dt = this.ctx.getDeltaTime();
		this._life += dt;
		this.object.position.addScaledVector(this.direction, dt);
		this.direction.y -= 10 * dt;
		const t = Math.max(0, 1 - this._life / this.lifetime);
		this.object.scale.setScalar(t);
		if (this._life >= this.lifetime) destroy(this.object);
	}
}

/** Attached to the player — tests gem pickup each frame. */
export class Collector extends Object3DBehaviour {
	pickupRadius = 1.2;

	onUpdate() {
		const game = this.modules.game;
		if (game.dead) return;
		for (const gem of game.gems) {
			if (this.object.position.distanceTo(gem.position) < this.pickupRadius) {
				game.collectGem(gem);
				break;
			}
		}
	}
}
