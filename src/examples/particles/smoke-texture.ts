import * as THREE from "three";

export function createSmokeTexture(): THREE.CanvasTexture {
	const size = 256;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d")!;

	const gradient = ctx.createRadialGradient(
		size / 2,
		size / 2,
		0,
		size / 2,
		size / 2,
		size / 2
	);
	gradient.addColorStop(0, "rgba(255,255,255,1)");
	gradient.addColorStop(0.4, "rgba(255,255,255,0.6)");
	gradient.addColorStop(1, "rgba(255,255,255,0)");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, size, size);

	const image = ctx.getImageData(0, 0, size, size);
	for (let i = 0; i < image.data.length; i += 4) {
		const noise = (Math.random() - 0.5) * 60;
		image.data[i + 3] = Math.max(0, Math.min(255, image.data[i + 3] + noise));
	}
	ctx.putImageData(image, 0, 0);

	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}
