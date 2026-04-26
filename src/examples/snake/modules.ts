import { ContextModule } from "@/core/ContextModule";
import { addComponent, destroy, getComponent } from "@/core/methods";
import * as THREE from "three/webgpu";
import {
	BurstEffect,
	Bobbing,
	CameraFollow,
	Collector,
	InvulnerabilityFlash,
	PlayerController,
	Pulse,
	Spin,
	TrailSegment,
} from "./behaviours";

// Type-safe access via `this.modules.<key>` everywhere.
declare module "@/core/Register" {
	interface ThreeStartRegister {
		modules: {
			assets: AssetsModule;
			input: PlayerInputModule;
			game: GameModule;
			hud: HudModule;
		};
	}
}

/** Shared geometries & materials reused across spawners. */
export class AssetsModule extends ContextModule {
	readonly gemGeo = new THREE.OctahedronGeometry(0.3);
	readonly gemMat = new THREE.MeshStandardMaterial({
		color: 0xffd700,
		emissive: 0x553300,
		roughness: 0.2,
	});
	readonly trailGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
	readonly trailMat = new THREE.MeshNormalMaterial();
	readonly playerMat = new THREE.MeshStandardMaterial({
		color: 0x00ffaa,
		emissive: 0x003322,
		roughness: 0.3,
	});
}

/**
 * Reads keyboard state and exposes a normalized XZ direction vector.
 * Any behaviour can read `this.modules.input.dir` instead of managing
 * its own key listeners.
 */
export class PlayerInputModule extends ContextModule {
	/** Normalized XZ movement direction. Zero vector when no keys are held. */
	readonly dir = new THREE.Vector3();

	private _raw = new THREE.Vector3();
	private _pressed = new Set<string>();

	private _onKeyDown = (e: KeyboardEvent) => this._pressed.add(e.code);
	private _onKeyUp = (e: KeyboardEvent) => this._pressed.delete(e.code);

	onStart() {
		document.addEventListener("keydown", this._onKeyDown);
		document.addEventListener("keyup", this._onKeyUp);
	}

	onUpdate() {
		const r = this._raw.set(0, 0, 0);
		if (this._pressed.has("KeyW") || this._pressed.has("ArrowUp")) r.z -= 1;
		if (this._pressed.has("KeyS") || this._pressed.has("ArrowDown")) r.z += 1;
		if (this._pressed.has("KeyA") || this._pressed.has("ArrowLeft")) r.x -= 1;
		if (this._pressed.has("KeyD") || this._pressed.has("ArrowRight")) r.x += 1;
		if (r.lengthSq() > 0) this.dir.copy(r).normalize();
		else this.dir.copy(r);
	}
}

export enum GameEvents {
	ScoreChanged = "scoreChanged",
	HealthChanged = "healthChanged",
	Died = "died",
	Restarted = "restarted",
}

type GameEventMap = {
	[GameEvents.ScoreChanged]: [score: number];
	[GameEvents.HealthChanged]: [health: number, max: number];
	[GameEvents.Died]: [score: number];
	[GameEvents.Restarted]: [];
};

/** Gameplay state + world construction + per-frame hazard checks. */
export class GameModule extends ContextModule<GameEventMap> {
	readonly MAX_HEALTH = 3;
	readonly gems = new Set<THREE.Object3D>();
	readonly trailSegments: THREE.Object3D[] = [];

	score = 0;
	health = this.MAX_HEALTH;
	dead = false;

	player!: THREE.Mesh;
	trailTail!: THREE.Object3D;

	onStart() {
		this._buildEnvironment();
		this._buildPlayer();
		this._buildCamera();
		for (let i = 0; i < 8; i++) this.spawnGem();
	}

	onUpdate() {
		if (this.dead) return;

		// Trail collision — skipped while InvulnerabilityFlash is active.
		if (
			!getComponent(this.player, InvulnerabilityFlash) &&
			this.trailSegments.length > 5
		) {
			for (let i = 5; i < this.trailSegments.length; i++) {
				const trail = getComponent(this.trailSegments[i], TrailSegment);
				if (trail && trail.grace > 0) continue;
				if (this.player.position.distanceTo(this.trailSegments[i].position) < 0.7) {
					this.takeDamage();
					break;
				}
			}
		}
	}

	// --- world building ---

	private _buildEnvironment() {
		const scene = this.ctx.scene;
		scene.background = new THREE.Color(0x0a0a1a);

		scene.add(new THREE.AmbientLight(0x404060, 2));
		const sun = new THREE.DirectionalLight(0xffffff, 3);
		sun.position.set(5, 10, 5);
		scene.add(sun);

		const ground = new THREE.Mesh(
			new THREE.PlaneGeometry(30, 30),
			new THREE.MeshStandardMaterial({ color: 0x1a1a2e })
		);
		ground.rotation.x = -Math.PI / 2;
		scene.add(ground);

		const grid = new THREE.Mesh(
			new THREE.PlaneGeometry(30, 30, 30, 30),
			new THREE.MeshBasicMaterial({ color: 0x2a2a4e, wireframe: true })
		);
		grid.rotation.x = -Math.PI / 2;
		grid.position.y = 0.01;
		scene.add(grid);
	}

	private _buildPlayer() {
		this.player = new THREE.Mesh(
			new THREE.IcosahedronGeometry(0.5, 1),
			this.modules.assets.playerMat
		);
		this.player.position.y = 0.5;
		this.ctx.scene.add(this.player);
		this.trailTail = this.player;

		addComponent(this.player, PlayerController);
		addComponent(this.player, Pulse);
		addComponent(this.player, Collector);
	}

	private _buildCamera() {
		const camera = this.ctx.camera;
		camera.position.set(0, 12, 10);
		camera.lookAt(0, 0, 0);
		addComponent(camera, CameraFollow).target = this.player;
	}

	// --- spawning & damage ---

	spawnGem() {
		const gem = new THREE.Mesh(
			this.modules.assets.gemGeo,
			this.modules.assets.gemMat
		);
		gem.position.set(this._randomPos(), 0.8, this._randomPos());
		this.ctx.scene.add(gem);

		addComponent(gem, Spin).speed.set(1, 3, 0.5);
		addComponent(gem, Bobbing).frequency = 2 + Math.random();

		this.gems.add(gem);
	}

	collectGem(gem: THREE.Object3D) {
		const pos = gem.position.clone();
		this.gems.delete(gem);
		destroy(gem);

		this.score++;
		this.emit(GameEvents.ScoreChanged, this.score);

		const seg = new THREE.Mesh(
			this.modules.assets.trailGeo,
			this.modules.assets.trailMat
		);
		seg.position.copy(pos);
		this.ctx.scene.add(seg);

		addComponent(seg, TrailSegment).target = this.trailTail;
		addComponent(seg, Spin).speed.set(0, 1.5, 0);
		this.trailTail = seg;
		this.trailSegments.push(seg);

		this._spawnBurst(pos);
		this.spawnGem();
	}

	takeDamage() {
		// Guard: can't be hit while already invulnerable.
		if (getComponent(this.player, InvulnerabilityFlash)) return;

		this.health--;
		this.emit(GameEvents.HealthChanged, this.health, this.MAX_HEALTH);

		this.modules.assets.playerMat.emissive.setHex(0x550000);

		const flash = addComponent(this.player, InvulnerabilityFlash);
		flash.onEnd = () => {
			this.modules.assets.playerMat.emissive.setHex(0x003322);
		};

		this._spawnBurst(this.player.position.clone(), BurstEffect.matDamage);

		if (this.health <= 0) this.die();
	}

	die() {
		this.dead = true;
		// Force-remove flash so the player stays visible on game-over screen.
		const flash = getComponent(this.player, InvulnerabilityFlash);
		if (flash) destroy(flash);
		this.modules.assets.playerMat.emissive.setHex(0x003322);
		getComponent(this.player, PlayerController)?.disable();
		this.emit(GameEvents.Died, this.score);
	}

	restart() {
		for (const seg of [...this.trailSegments]) destroy(seg);
		this.trailSegments.length = 0;
		this.trailTail = this.player;

		for (const gem of [...this.gems]) destroy(gem);
		this.gems.clear();

		this.score = 0;
		this.health = this.MAX_HEALTH;
		this.dead = false;

		this.player.position.set(0, 0.5, 0);
		const flash = getComponent(this.player, InvulnerabilityFlash);
		if (flash) destroy(flash);
		this.modules.assets.playerMat.emissive.setHex(0x003322);

		getComponent(this.player, PlayerController)?.enable();

		this.emit(GameEvents.Restarted);
		this.emit(GameEvents.ScoreChanged, this.score);
		this.emit(GameEvents.HealthChanged, this.health, this.MAX_HEALTH);

		for (let i = 0; i < 8; i++) this.spawnGem();
	}

	/**
	 * Spawns a self-contained burst effect at the given position.
	 * Creates a temporary host object, attaches BurstEffect, and lets
	 * the component handle everything — including its own cleanup.
	 */
	private _spawnBurst(pos: THREE.Vector3, material = BurstEffect.mat) {
		const host = new THREE.Object3D();
		host.position.copy(pos);
		// Configure before scene.add — no context yet, so addComponent defers activation.
		// When scene.add fires, context resolves and onStart runs with the correct config.
		const burst = addComponent(host, BurstEffect);
		burst.material = material;
		this.ctx.scene.add(host);
	}

	private _randomPos() {
		return (Math.random() - 0.5) * 24;
	}
}

/** HUD text + game-over overlay — driven entirely by GameModule events. */
export class HudModule extends ContextModule {
	private _hudEl: HTMLDivElement | null = null;
	private _overlayEl: HTMLDivElement | null = null;

	private _score = 0;
	private _health = 0;
	private _maxHealth = 0;

	private _onKey = (e: KeyboardEvent) => {
		if (this.modules.game.dead) {
			e.preventDefault();
			this.modules.game.restart();
		}
	};

	onStart() {
		this._hudEl = document.createElement("div");
		this._hudEl.style.cssText =
			"position:fixed;top:20px;left:20px;color:white;font-family:monospace;font-size:20px;z-index:10;pointer-events:none;text-shadow:0 2px 8px rgba(0,0,0,0.8);line-height:1.6;";
		document.body.appendChild(this._hudEl);

		this._overlayEl = document.createElement("div");
		this._overlayEl.style.cssText =
			"position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);color:white;font-family:monospace;z-index:20;text-align:center;line-height:1.8;";
		document.body.appendChild(this._overlayEl);

		document.addEventListener("keydown", this._onKey);

		// Subscribe to game events — no polling needed.
		const game = this.modules.game;
		game.on(GameEvents.ScoreChanged, (score) => {
			this._score = score;
			this._renderHud();
		});
		game.on(GameEvents.HealthChanged, (health, max) => {
			this._health = health;
			this._maxHealth = max;
			this._renderHud();
		});
		game.on(GameEvents.Died, () => this._showOverlay());
		game.on(GameEvents.Restarted, () => this._hideOverlay());

		// Render initial state.
		this._score = game.score;
		this._health = game.health;
		this._maxHealth = game.MAX_HEALTH;
		this._renderHud();
	}

	private _renderHud() {
		if (!this._hudEl) return;
		const hearts =
			"\u2764\uFE0F".repeat(this._health) +
			"\u{1F5A4}".repeat(this._maxHealth - this._health);
		this._hudEl.textContent = `Score: ${this._score}  ${hearts}`;
	}

	private _showOverlay() {
		if (!this._overlayEl) return;
		const game = this.modules.game;
		this._overlayEl.innerHTML = [
			'<div style="font-size:48px;margin-bottom:16px;">GAME OVER</div>',
			`<div style="font-size:28px;">Score: ${this._score}</div>`,
			`<div style="font-size:28px;">Tail length: ${game.trailSegments.length}</div>`,
			'<div style="font-size:18px;margin-top:24px;opacity:0.6;">Press any key to restart</div>',
		].join("");
		this._overlayEl.style.display = "flex";
	}

	private _hideOverlay() {
		if (!this._overlayEl) return;
		this._overlayEl.style.display = "none";
	}
}
