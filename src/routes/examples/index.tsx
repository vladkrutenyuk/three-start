import { EXAMPLES } from "@/examples/_examples";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/examples/")({
	loader: () => {
		throw redirect({ to: "/examples/$example", params: { example: EXAMPLES[0].id } });
	},
});
