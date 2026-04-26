import { EXAMPLES } from "@/examples/_examples";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/examples/$example")({
	component: RouteComponent,
});

function RouteComponent() {
	const { example } = Route.useParams();

	return (
		<div className="fixed inset-0 flex bg-black text-white">
			<div className="shrink-0 w-[200px] p-2">
				{EXAMPLES.map((item) => (
					<Link
						key={item.id}
						aria-selected={example === item.id}
						className="w-full h-[120px] flex items-center justify-center text-sm data-[status=active]:bg-white/10"
						to="/examples/$example"
						params={{ example: item.id }}
					>
						{item.id}
					</Link>
				))}
			</div>
			<div className="flex-1 relative">
				<div className="absolute inset-0">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
