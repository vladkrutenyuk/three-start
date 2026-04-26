import { Object3DBehaviour } from "@/core/Object3DBehaviour";

/**
 * Marks an object as something the player can target with the {@link Interactor}
 * and trigger via the configured key (E by default).
 *
 * Owners set `hint` (shown under the crosshair while targeted) and `onInteract`
 * (the callback that fires on key press). Range is checked by the Interactor
 * against `interactRange`.
 */
export class Interactable extends Object3DBehaviour {
	hint = "press [E]";
	interactRange = 3;
	onInteract: () => void = () => {};
}
