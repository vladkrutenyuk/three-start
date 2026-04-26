"use client";

import { use, useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";

export function Mermaid({ chart }: { chart: string }) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;
	return <MermaidContent chart={chart} />;
}

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(key: string, setPromise: () => Promise<T>): Promise<T> {
	const cached = cache.get(key);
	if (cached) return cached as Promise<T>;

	const promise = setPromise().catch((err) => {
		cache.delete(key);
		throw err;
	});
	cache.set(key, promise);
	return promise;
}

function MermaidContent({ chart }: { chart: string }) {
	const id = useId();
	const safeId = `m${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
	const { resolvedTheme } = useTheme();
	const { default: mermaid } = use(
		cachePromise("mermaid", () => import("mermaid")),
	);

	mermaid.initialize({
		startOnLoad: false,
		securityLevel: "loose",
		fontFamily: "inherit",
		themeCSS: "margin: 1.5rem auto 0;",
		theme: resolvedTheme === "dark" ? "dark" : "default",
	});

	const result = use(
		cachePromise(`${chart}-${resolvedTheme}`, async () => {
			try {
				const { svg, bindFunctions } = await mermaid.render(
					safeId,
					chart.replaceAll("\\n", "\n"),
				);
				return { ok: true as const, svg, bindFunctions };
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Mermaid render failed";
				return { ok: false as const, message };
			}
		}),
	);

	if (!result.ok) {
		return (
			<pre
				style={{
					padding: "1rem",
					border: "1px solid #f99",
					background: "#fee",
					color: "#900",
					whiteSpace: "pre-wrap",
					fontSize: "0.85em",
				}}
			>
				{`Mermaid render error: ${result.message}\n\n${chart}`}
			</pre>
		);
	}

	return (
		<div
			ref={(container) => {
				if (container) result.bindFunctions?.(container);
			}}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid SVG output
			dangerouslySetInnerHTML={{ __html: result.svg }}
		/>
	);
}
