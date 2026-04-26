import { URL, fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
	publicDir: false,
	plugins: [viteReact()],
	build: {
		outDir: "dist",
		emptyOutDir: true,
		sourcemap: true,
		minify: "esbuild",
		cssMinify: true,
		lib: {
			entry: {
				index: resolve("src/core/index.ts"),
				react: resolve("src/core/react/index.ts"),
			},
			formats: ["es"],
		},
		rollupOptions: {
			external: [
				"react",
				"react/jsx-runtime",
				"react-dom",
				/^three(\/.*)?$/,
				"eventemitter3",
			],
			output: {
				preserveModules: false,
				entryFileNames: "[name].js",
				chunkFileNames: "chunks/[name]-[hash].js",
			},
		},
	},
	resolve: {
		alias: {
			"@": resolve("src"),
			"#": resolve("src"),
		},
	},
	esbuild: {
		legalComments: "none",
	},
});
