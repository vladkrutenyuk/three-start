import { createFileRoute, redirect } from "@tanstack/react-router";
import { ThreeRendererMount } from "@/core/react/ThreeRendererMount";
import { EXAMPLES } from "@/examples/_examples";

export const Route = createFileRoute("/examples/src/$exampleId")({
  // Examples construct renderers and touch window/document at module scope —
  // client-only. This page only ever renders inside the viewer's iframe.
  ssr: false,
  component: RouteComponent,
  loader: async (ctx) => {
    const id = ctx.params.exampleId;
    const example = EXAMPLES.find((x) => x.id === id);
    if (!example) throw redirect({ to: "/" });
    return example.loadStarter();
  },
  pendingComponent: () => {},
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const startInstance = data.default;
  startInstance.start();
  return (
    <ThreeRendererMount
      className="fixed inset-0 bg-[#070907]"
      ctx={startInstance.ctx}
    />
  );
}
