import { useEffect, useRef } from "react";
import type { ComponentProps, FC } from "react";
import { ThreeContext } from "../ThreeContext";

export const ThreeRendererMount: FC<ComponentProps<"div"> & { ctx: ThreeContext }> = ({
	ctx,
	...props
}) => {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		ctx.mount(element);

		return () => {
			ctx.unmount();
		};
	}, [ctx]);

	return <div ref={ref} {...props} />;
};
