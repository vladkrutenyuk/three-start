import { ThreeStart } from "@/core/ThreeStart";
import * as THREE from "three/webgpu";
import { AssetsModule, GameModule, HudModule, PlayerInputModule } from "./modules";

const starter = new ThreeStart({
	renderer: new THREE.WebGPURenderer({ antialias: true }),
}).addModules({
	assets: new AssetsModule(),
	input: new PlayerInputModule(),
	game: new GameModule(),
	hud: new HudModule(),
});
export default starter;
