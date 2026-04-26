import { ContextModule } from "@/core/ContextModule";
import { ThreeContextEvents } from "@/core/ThreeContext";

/**
 * Renders a crosshair (`+`) over the canvas centre and an optional hint line
 * underneath ("press [E] ..."). Components push hints in via `setHint(text)`
 * each frame they want the prompt visible; passing `null` (or just not calling
 * each frame) hides it.
 */
export class CrosshairModule extends ContextModule {
	private root: HTMLDivElement | null = null;
	private dot!: HTMLDivElement;
	private hint!: HTMLDivElement;

	onAwake() {
		const root = document.createElement("div");
		root.style.cssText = `
			position: absolute;
			inset: 0;
			pointer-events: none;
			display: grid;
			place-items: center;
			font: 13px/1 system-ui, sans-serif;
			color: #fff;
			text-shadow: 0 0 4px #000;
			z-index: 10;
		`;

		this.dot = document.createElement("div");
		this.dot.textContent = "+";
		this.dot.style.cssText = `
			font-size: 20px;
			line-height: 1;
			opacity: 0.85;
		`;
		root.appendChild(this.dot);

		this.hint = document.createElement("div");
		this.hint.style.cssText = `
			position: absolute;
			top: calc(50% + 22px);
			padding: 4px 10px;
			background: rgba(0, 0, 0, 0.55);
			border-radius: 4px;
			display: none;
		`;
		root.appendChild(this.hint);

		this.root = root;

		// Mount when the canvas mounts; remove on unmount.
		this.ctx.on(ThreeContextEvents.Mount, this.onMount);
		this.ctx.on(ThreeContextEvents.Unmount, this.onUnmount);

		// If already mounted by the time we awoke, attach now.
		if (this.ctx.canvasContainer) this.onMount(this.ctx.canvasContainer);
	}

	onUpdate() {
		// Hints are push-per-frame — clear at start of frame so callers must
		// re-set every frame they want it visible.
		this.hideHint();
	}

	setHint(text: string) {
		this.hint.textContent = text;
		this.hint.style.display = "block";
	}

	private hideHint() {
		this.hint.style.display = "none";
	}

	private onMount = (container: HTMLDivElement) => {
		if (!this.root) return;
		// Container needs relative positioning so absolute overlay aligns.
		const cs = getComputedStyle(container);
		if (cs.position === "static") container.style.position = "relative";
		container.appendChild(this.root);
	};

	private onUnmount = () => {
		this.root?.remove();
	};
}
