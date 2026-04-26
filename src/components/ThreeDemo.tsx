"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three/webgpu";
import {
	addComponent,
	destroy,
	getComponent,
	setActive as setObjActive,
} from "@/core/methods";
import { Object3DBehaviour } from "@/core/Object3DBehaviour";
import { ThreeStart } from "@/core/ThreeStart";

// ---------- behaviours ----------

class SpinBehaviour extends Object3DBehaviour {
	private _initRotY = 0;

	private get mat() {
		return (this.object as THREE.Mesh).material as THREE.MeshMatcapMaterial;
	}
	onAwake() {
		this._initRotY = this.object.rotation.y;
		this.mat.color.set(0x4ade80);
	}
	onEnable() {
		this.mat.color.set(0x4ade80);
	}
	onDisable() {
		this.mat.color.set(0xfbbf24);
	}
	onDestroy() {
		this.object.rotation.y = this._initRotY;
		this.mat.color.set(0x71717a);
	}
	onUpdate() {
		const dt = this.ctx.getDeltaTime();
		this.object.rotation.y += dt;
		this.object.rotation.x += dt * 0.4;
	}
}

class BobBehaviour extends Object3DBehaviour {
	amplitude = 0.3;
	frequency = 0.5;
	private _baseY = 0;

	private get mat() {
		return (this.object as THREE.Mesh).material as THREE.MeshMatcapMaterial;
	}

	onAwake() {
		this._baseY = this.object.position.y;
	}
	onEnable() {
		this.mat.transparent = false;
		this.mat.opacity = 1;
	}
	onDisable() {
		this.mat.transparent = true;
		this.mat.opacity = 0.3;
	}
	onUpdate() {
		const t = this.ctx.getTime();
		this.object.position.y =
			this._baseY + Math.sin(t * this.frequency * Math.PI * 2) * this.amplitude;
	}
	onDestroy() {
		this.object.position.y = this._baseY;
		this.mat.transparent = false;
		this.mat.opacity = 1;
	}
}

// ---------- syntax highlighting (hand-tokenized; colours match shiki github themes) ----------

// Same hex values shiki produces for `github-light` / `github-dark` — so tokens
// here visually match the rest of the docs. Each token gets a `--shiki-light` /
// `--shiki-dark` CSS var; the parent `<code>` resolves the right one per theme.
const TOKEN_FN = {
	"--shiki-light": "#8250df",
	"--shiki-dark": "#d2a8ff",
} as React.CSSProperties;
const TOKEN_CLASS = {
	"--shiki-light": "#953800",
	"--shiki-dark": "#ffa657",
} as React.CSSProperties;
const TOKEN_KEYWORD = {
	"--shiki-light": "#cf222e",
	"--shiki-dark": "#ff7b72",
} as React.CSSProperties;
const TOKEN_VAR = {
	"--shiki-light": "#24292f",
	"--shiki-dark": "#e6edf3",
} as React.CSSProperties;

const FNS = new Set([
	"addComponent",
	"destroy",
	"getComponent",
	"setActive",
	"enable",
	"disable",
]);
const KEYWORDS = new Set(["true", "false", "null", "undefined"]);

function tokenStyle(t: string): React.CSSProperties | undefined {
	if (FNS.has(t)) return TOKEN_FN;
	if (KEYWORDS.has(t)) return TOKEN_KEYWORD;
	if (/^[A-Z][A-Za-z0-9_$]*$/.test(t)) return TOKEN_CLASS;
	if (/^[a-z_$][\w$]*$/.test(t)) return TOKEN_VAR;
	return undefined; // punctuation/whitespace — inherits muted colour from parent
}

function HighlightedCode({ code }: { code: string }) {
	const tokens = code.match(/[a-zA-Z_$][\w$]*|[(),.;]|\s+/g) ?? [];
	return (
		<code className="flex-1 font-mono text-xs whitespace-nowrap text-fd-muted-foreground [&_span]:text-[var(--shiki-light)] dark:[&_span]:text-[var(--shiki-dark)]">
			{tokens.map((t, i) => {
				const style = tokenStyle(t);
				if (!style) return <span key={i}>{t}</span>;
				return (
					<span key={i} style={style}>
						{t}
					</span>
				);
			})}
		</code>
	);
}

// ---------- rows config ----------

type SpinKey = "spin-add" | "spin-destroy" | "spin-enable" | "spin-disable";
type BobKey = "bob-add" | "bob-destroy" | "bob-enable" | "bob-disable";
type ActiveKey = "active-on" | "active-off";
type RowKey = SpinKey | BobKey | ActiveKey;

interface Row {
	key: RowKey;
	code: string;
	label: string;
}

const SPIN_ROWS: Row[] = [
	{ key: "spin-add", code: "addComponent(cube, Spin)", label: "Add" },
	{
		key: "spin-destroy",
		code: "destroy(getComponent(cube, Spin))",
		label: "Destroy",
	},
	{
		key: "spin-enable",
		code: "getComponent(cube, Spin).enable()",
		label: "Enable",
	},
	{
		key: "spin-disable",
		code: "getComponent(cube, Spin).disable()",
		label: "Disable",
	},
];

const BOB_ROWS: Row[] = [
	{ key: "bob-add", code: "addComponent(cube, Bob)", label: "Add" },
	{
		key: "bob-destroy",
		code: "destroy(getComponent(cube, Bob))",
		label: "Destroy",
	},
	{
		key: "bob-enable",
		code: "getComponent(cube, Bob).enable()",
		label: "Enable",
	},
	{
		key: "bob-disable",
		code: "getComponent(cube, Bob).disable()",
		label: "Disable",
	},
];

const ACTIVE_ROWS: Row[] = [
	{ key: "active-on", code: "setActive(cube, true)", label: "Activate" },
	{ key: "active-off", code: "setActive(cube, false)", label: "Deactivate" },
];

// ---------- component ----------

export function ThreeDemo() {
	const mountRef = useRef<HTMLDivElement>(null);
	const starterRef = useRef<ThreeStart | null>(null);
	const cubeRef = useRef<THREE.Mesh | null>(null);

	const [hasSpin, setHasSpin] = useState(false);
	const [isSpinEnabled, setIsSpinEnabled] = useState(false);

	const [hasBob, setHasBob] = useState(false);
	const [isBobEnabled, setIsBobEnabled] = useState(false);

	const [isCubeActive, setIsCubeActive] = useState(true);

	// Each group remembers its own last-pressed row independently.
	const [activeSpin, setActiveSpin] = useState<SpinKey | null>(null);
	const [activeBob, setActiveBob] = useState<BobKey | null>(null);
	const [activeAct, setActiveAct] = useState<ActiveKey | null>(null);

	useEffect(() => {
		const el = mountRef.current;
		if (!el) return;

		const starter = new ThreeStart();
		starterRef.current = starter;

		const { camera, scene } = starter.ctx;
		camera.position.set(2.5, 2, 2.5);
		camera.lookAt(0, 0, 0);
		scene.add(new THREE.AmbientLight(0xffffff, 3));

		const cube = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshMatcapMaterial({ color: 0x71717a })
		);
		scene.add(cube);
		cubeRef.current = cube;

		starter.mount(el);
		starter.start();

		return () => {
			starter.unmount();
			starterRef.current = null;
			cubeRef.current = null;
		};
	}, []);

	const run = useCallback((key: RowKey) => {
		const cube = cubeRef.current;
		if (!cube) return;
		if (key.startsWith("spin-")) setActiveSpin(key as SpinKey);
		else if (key.startsWith("bob-")) setActiveBob(key as BobKey);
		else setActiveAct(key as ActiveKey);

		switch (key) {
			case "spin-add": {
				if (!getComponent(cube, SpinBehaviour)) {
					addComponent(cube, SpinBehaviour);
					setHasSpin(true);
					setIsSpinEnabled(true);
				}
				return;
			}
			case "spin-destroy": {
				const c = getComponent(cube, SpinBehaviour);
				if (c) {
					destroy(c);
					setHasSpin(false);
					setIsSpinEnabled(false);
				}
				return;
			}
			case "spin-enable": {
				getComponent(cube, SpinBehaviour)?.enable();
				setIsSpinEnabled(true);
				return;
			}
			case "spin-disable": {
				getComponent(cube, SpinBehaviour)?.disable();
				setIsSpinEnabled(false);
				return;
			}
			case "bob-add": {
				if (!getComponent(cube, BobBehaviour)) {
					addComponent(cube, BobBehaviour);
					setHasBob(true);
					setIsBobEnabled(true);
				}
				return;
			}
			case "bob-destroy": {
				const c = getComponent(cube, BobBehaviour);
				if (c) {
					destroy(c);
					setHasBob(false);
					setIsBobEnabled(false);
				}
				return;
			}
			case "bob-enable": {
				getComponent(cube, BobBehaviour)?.enable();
				setIsBobEnabled(true);
				return;
			}
			case "bob-disable": {
				getComponent(cube, BobBehaviour)?.disable();
				setIsBobEnabled(false);
				return;
			}
			case "active-on": {
				setObjActive(cube, true);
				setIsCubeActive(true);
				return;
			}
			case "active-off": {
				setObjActive(cube, false);
				setIsCubeActive(false);
				return;
			}
		}
	}, []);

	const isDisabled = (key: RowKey) => {
		switch (key) {
			case "spin-add":
				return hasSpin;
			case "spin-destroy":
				return !hasSpin;
			case "spin-enable":
				return !hasSpin || isSpinEnabled;
			case "spin-disable":
				return !hasSpin || !isSpinEnabled;
			case "bob-add":
				return hasBob;
			case "bob-destroy":
				return !hasBob;
			case "bob-enable":
				return !hasBob || isBobEnabled;
			case "bob-disable":
				return !hasBob || !isBobEnabled;
			case "active-on":
				return isCubeActive;
			case "active-off":
				return !isCubeActive;
		}
	};

	const renderGroup = (title: string, rows: Row[], activeKey: RowKey | null) => (
		<div className="flex flex-col">
			<div className="px-4 pt-2.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-fd-muted-foreground/70">
				{title}
			</div>
			<div className="flex flex-col divide-y divide-fd-border/50">
				{rows.map(({ key, code, label }) => (
					<div
						key={key}
						className={`flex items-center gap-3 px-4 py-2 transition-colors ${
							activeKey === key ? "bg-fd-accent/50" : ""
						}`}
					>
						<HighlightedCode code={code} />
						<button
							type="button"
							onClick={() => run(key)}
							disabled={isDisabled(key)}
							className="shrink-0 rounded px-3 py-1 text-xs font-medium bg-fd-primary text-fd-primary-foreground disabled:opacity-25 disabled:cursor-not-allowed hover:opacity-80 transition-opacity cursor-pointer"
						>
							{label}
						</button>
					</div>
				))}
			</div>
		</div>
	);

	return (
		<div className="not-prose my-6 flex rounded-lg border border-fd-border overflow-hidden text-sm bg-fd-card">
			{/* canvas */}
			<div ref={mountRef} className="shrink-0 w-72 self-stretch bg-black" />

			{/* command groups */}
			<div className="flex flex-col justify-center border-l border-fd-border flex-1 py-1 gap-1">
				{renderGroup("Spin component", SPIN_ROWS, activeSpin)}
				{renderGroup("Bob component", BOB_ROWS, activeBob)}
				{renderGroup("Whole object (cube)", ACTIVE_ROWS, activeAct)}
			</div>
		</div>
	);
}
