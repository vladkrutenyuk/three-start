import { createFileRoute, redirect } from "@tanstack/react-router";
import { EXAMPLES } from "@/examples/_examples";

export const Route = createFileRoute("/examples/")({
  loader: () => {
    throw redirect({
      to: "/examples/$example",
      params: { example: EXAMPLES[0].id },
    });
  },
});
