import { createFileRoute, useLinkProps } from "@tanstack/react-router";

export const Route = createFileRoute("/examples/$example/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { example } = Route.useParams();
  const linkProps = useLinkProps({
    to: "/examples/src/$exampleId",
    params: {
      exampleId: example,
    },
  });

  return (
    <div className="size-full relative">
      <div className="absolute inset-0">
        <iframe
          src={linkProps.href}
          title={`${example} — live example`}
          className="size-full"
        />
      </div>
    </div>
  );
}
