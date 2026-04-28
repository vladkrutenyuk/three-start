import type { ThreeStart } from "@/core/ThreeStart";

interface ExampleItem {
	id: string;
	loadStarter: () => Promise<{ default: ThreeStart }>;
}
export const EXAMPLES: ExampleItem[] = [
	{
		id: "snake",
		loadStarter: async () => {
			return await import("./snake/index");
		},
	},
	{
		id: "particles",
		loadStarter: async () => {
			return await import("./particles/index");
		},
	},
	{
		id: "cube",
		loadStarter: async () => {
			return await import("./cube/index");
		},
	},
	{
		id: "sphere",
		loadStarter: async () => {
			return await import("./sphere/index");
		},
	},
];
