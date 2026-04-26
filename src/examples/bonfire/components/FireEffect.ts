import * as THREE from "three/webgpu";
import {
	createParticleSystem,
	type ParticleSystem,
} from "@newkrok/three-particles";
import { enableWebGPU } from "@newkrok/three-particles/webgpu";
import { Object3DBehaviour } from "@/core/Object3DBehaviour";

// `@newkrok/three-particles` exports its enums as `const enum`, which can't be
// imported as values under `isolatedModules`. We pass the underlying string
// literals; the config payload is typed as the package's `ParticleSystemConfig`
// via a single cast at the call site below.

// One-time install of the WebGPU compute path. Safe to call multiple times —
// the library guards internally.
enableWebGPU();

/**
 * Fire particle effect. The host object becomes the emitter root: the system's
 * `instance` (a `THREE.Points` / similar) is added as a child of `this.object`.
 *
 * Toggling `enable()` / `disable()` pauses and resumes emission; `onUpdate`
 * advances the simulation and dispatches the GPU compute pass when active.
 */
export class FireEffect extends Object3DBehaviour {
	private system: ParticleSystem | null = null;

	onAwake() {
		// Cast — see comment above re: const-enum string literals + isolatedModules.
		const sys = createParticleSystem({
			duration: 5,
			looping: true,
			maxParticles: 400,
			simulationBackend: "AUTO",

			startLifetime: { min: 0.6, max: 1.2 },
			startSpeed: { min: 1.4, max: 2.4 },
			startSize: { min: 0.18, max: 0.32 },
			startOpacity: 0.9,
			startColor: {
				min: { r: 1, g: 0.45, b: 0.05 },
				max: { r: 1, g: 0.85, b: 0.25 },
			},

			gravity: -0.3, // negative gravity = upward drift
			emission: { rateOverTime: 90 },
			shape: { shape: "CONE", cone: { angle: 0.45, radius: 0.25 } },

			sizeOverLifetime: {
				isActive: true,
				lifetimeCurve: {
					type: "BEZIER",
					bezierPoints: [
						{ x: 0, y: 0.2, percentage: 0 },
						{ x: 0.5, y: 1.0, percentage: 0.5 },
						{ x: 1, y: 0, percentage: 1 },
					],
					scale: 1,
				},
			},
			opacityOverLifetime: {
				isActive: true,
				lifetimeCurve: {
					type: "BEZIER",
					bezierPoints: [
						{ x: 0, y: 0, percentage: 0 },
						{ x: 0.2, y: 1, percentage: 0.2 },
						{ x: 1, y: 0, percentage: 1 },
					],
					scale: 1,
				},
			},

			renderer: {
				blending: THREE.AdditiveBlending,
				transparent: true,
				depthWrite: false,
			},
		} as Parameters<typeof createParticleSystem>[0]);
		this.system = sys;
		this.object.add(sys.instance);
		// Created paused — caller decides when to start.
		sys.pauseEmitter();
	}

	onEnable() {
		this.system?.resumeEmitter();
	}

	onDisable() {
		this.system?.pauseEmitter();
	}

	onUpdate() {
		if (!this.system) return;
		this.system.update({
			now: performance.now(),
			delta: this.ctx.getDeltaTime(),
			elapsed: this.ctx.getTime(),
		});
		// Dispatch GPU compute pass when active (no-op on CPU backend).
		const node = this.system.computeNode;
		if (node)
			(this.ctx.renderer as THREE.WebGPURenderer).compute(
				node as unknown as THREE.ComputeNode
			);
	}

	onDestroy() {
		if (!this.system) return;
		this.system.instance.removeFromParent();
		this.system.dispose();
		this.system = null;
	}
}
