import type { ThreeStart } from "@/core/ThreeStart";

export interface ExampleItem {
  id: string;
  title: string;
  tagline: string;
  concepts: string[];
  loadStarter: () => Promise<{ default: ThreeStart }>;
  loadSource: () => Promise<{ default: string }>;
}

// Ordered: basics first, then one concept per example.
export const EXAMPLES: ExampleItem[] = [
  {
    id: "spin",
    title: "Hello, three-start",
    tagline: "Bootstrap a scene and add your first component.",
    concepts: ["ThreeStart", "Object3DBehaviour", "addComponent"],
    loadStarter: () => import("./spin/index"),
    loadSource: () => import("./spin/index?raw"),
  },
  {
    id: "components",
    title: "Composition",
    tagline: "Three small components stacked on one object.",
    concepts: ["composition", "event methods"],
    loadStarter: () => import("./components/index"),
    loadSource: () => import("./components/index?raw"),
  },
  {
    id: "lifecycle",
    title: "Lifecycle",
    tagline: "Watch a component move through its event methods, live.",
    concepts: ["onAwake…onDestroy", "enable / disable", "destroy"],
    loadStarter: () => import("./lifecycle/index"),
    loadSource: () => import("./lifecycle/index?raw"),
  },
  {
    id: "wave-field",
    title: "Wave field",
    tagline: "One component class, 324 instances, constructor args.",
    concepts: ["constructor args", "many instances"],
    loadStarter: () => import("./wave-field/index"),
    loadSource: () => import("./wave-field/index?raw"),
  },
  {
    id: "orbits",
    title: "Orbits",
    tagline: "The same component reused across a scene-graph hierarchy.",
    concepts: ["scene graph", "component reuse"],
    loadStarter: () => import("./orbits/index"),
    loadSource: () => import("./orbits/index?raw"),
  },
  {
    id: "pointer",
    title: "Pointer module",
    tagline:
      "A global system on the context that any component can read. Move the pointer.",
    concepts: ["ContextModule", "this.modules"],
    loadStarter: () => import("./pointer/index"),
    loadSource: () => import("./pointer/index?raw"),
  },
  {
    id: "set-active",
    title: "setActive",
    tagline: "Deactivate a whole subtree with one call. Click to toggle.",
    concepts: ["setActive", "getIsActive", "onDisable"],
    loadStarter: () => import("./set-active/index"),
    loadSource: () => import("./set-active/index?raw"),
  },
  {
    id: "slow-motion",
    title: "Slow motion",
    tagline:
      "One shared timer — scale time for every component at once. Hold the pointer.",
    concepts: ["timescale", "getDeltaTime"],
    loadStarter: () => import("./slow-motion/index"),
    loadSource: () => import("./slow-motion/index?raw"),
  },
];
