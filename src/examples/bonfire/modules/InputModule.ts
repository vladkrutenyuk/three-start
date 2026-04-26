import { ContextModule } from "@/core/ContextModule";

/**
 * Tracks pressed keys (held + just-pressed-this-frame) on the window.
 * `wasJustPressed` is cleared in onUpdate, so it's only true on the frame the
 * key first went down — perfect for one-shot actions like "press E to toggle".
 */
export class InputModule extends ContextModule {
	private held = new Set<string>();
	private justPressed = new Set<string>();

	onAwake() {
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
	}

	onUpdate() {
		// Run AFTER components had a chance to read justPressed this frame.
		// Modules' onUpdate fires before component onUpdate — so clear the
		// previous-frame set at the START of this frame, then absorb new ones
		// from keydown events that fire between frames.
		// Simplest correct order: clear here (modules first), components see
		// only keys pressed since the previous frame's clear.
		this.justPressed.clear();
	}

	onDestroy?: never; // never destroyed — modules don't have onDestroy

	isPressed(code: string) {
		return this.held.has(code);
	}

	wasJustPressed(code: string) {
		return this.justPressed.has(code);
	}

	private onKeyDown = (e: KeyboardEvent) => {
		if (!this.held.has(e.code)) this.justPressed.add(e.code);
		this.held.add(e.code);
	};

	private onKeyUp = (e: KeyboardEvent) => {
		this.held.delete(e.code);
	};
}
