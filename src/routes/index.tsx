import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/landing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Three Start — the missing foundation for Three.js apps" },
      {
        name: "description",
        content:
          "Minimal foundation layer for Three.js: bootstrap, lifecycle, and a unified component model. A thin layer around Three.js, not a replacement for it.",
      },
    ],
  }),
  component: LandingPage,
});
