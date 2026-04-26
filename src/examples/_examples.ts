import type { ThreeStart } from "@/core/ThreeStart";

interface ExampleItem {
	id: string;
	loadStarter: () => Promise<{ starter: ThreeStart }>;
}
export const EXAMPLES: ExampleItem[] = [
	{
		id: "bonfire",
		loadStarter: async () => {
			return await import("./bonfire/index");
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
	{
		id: "snake",
		loadStarter: async () => {
			return await import("./snake/index");
		},
	},
];
