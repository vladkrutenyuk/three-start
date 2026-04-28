import { EXAMPLES } from "@/examples/_examples";
import { ThreeRendererMount } from "@/core/react/ThreeRendererMount";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/examples/src/$exampleId")({
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
	return <ThreeRendererMount className="fixed inset-0" ctx={startInstance.ctx} />;
}
