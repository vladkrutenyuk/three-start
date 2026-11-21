import { afterEach, describe, expect, it } from "vitest";
import { ThreeContextEvents } from "../src/core";
import { createScene, sleep, type TestScene } from "./helpers/scene";

// Resizing follows the canvas container, but a container that measures 0×0 (hidden with
// `display: none`, or already removed from the page) keeps the last size: a 0×0 canvas has
// no swapchain texture, and every render to it fails.

const open: TestScene[] = [];

afterEach(() => {
	for (const s of open.splice(0)) s.dispose();
});

describe("resize", () => {
	it("follows the container size", async () => {
		const s = await createScene();
		open.push(s);
		const sizes: [number, number][] = [];
		s.ctx.on(ThreeContextEvents.Resized, (width, height) => sizes.push([width, height]));

		await s.run(50);
		s.container.style.width = "96px";
		await sleep(100);

		expect(sizes.at(-1)).toEqual([96, 64]);
	});

	it("keeps the last size while the container measures 0×0", async () => {
		const s = await createScene();
		open.push(s);
		await s.run(50);
		const { width, height } = s.renderer.domElement;
		const sizes: [number, number][] = [];
		s.ctx.on(ThreeContextEvents.Resized, (w, h) => sizes.push([w, h]));

		s.container.style.display = "none";
		await sleep(100);

		expect(sizes).toEqual([]);
		expect([s.renderer.domElement.width, s.renderer.domElement.height]).toEqual([width, height]);
		expect(s.rec.errors).toEqual([]);
	});
});
