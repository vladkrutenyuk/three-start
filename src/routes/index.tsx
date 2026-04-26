import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<>
			<main>
				<section className="w-screen h-screen relative">
					<div className="flex flex-col items-center text-center blur-[0.5px]">
						<div className="relative mt-10">
							<h1 className="absolute top-0 text-9xl tracking-tighter blur-sm opacity-45 font-serif scale-y-[1.3]">
								Three Start
							</h1>
							<h1 className="absolute top-0 text-9xl tracking-tighter font-serif scale-y-[1.3]">
								Three Start
							</h1>
							<h1 className="opacity-0 text-9xl tracking-tighter font-serif scale-y-[1.3]">
								Three Start
							</h1>
						</div>

						<div className="my-3 opacity-70 h-0.5 w-[620px] bg-white/40" />
						<p className="max-w-[690px] text-3xl text-white/70">
							The missing foundation for Three.js apps
						</p>
						{/* <code className="scale-y-125 absolute tracking-tighter">
							npm i three-start
						</code>
						<div className="h-12" /> */}
						<div className="h-4" />
						{/* <p className="max-w-[600px] text-lg text-white/80">
							boilerplate, lifecycle, and component model — solved
						</p> */}
						<div className="h-6" />
						<pre>
							{`
						
						Scene (root, context attached here)
						└─ Mesh (Object3DExtension с компонентами)
							└─ resolveContext() → 
						
						`}
						</pre>
						<div className="p-2 text-sm text-white bg-black rounded-[2px] border border-white/20 flex flex-col">
							{[
								`import { ThreeStart } from "three-start";`,
								``,
								`const starter = new ThreeStart();`,
								`starter.mount(document.querySelector("#canvasContainer"))`,
								`>`,
							].map((line, i) => (
								<div className="font-mono hover:bg-white/15" key={line}>
									<span className="text-white/60">{i}</span>
									&nbsp;
									<span>{line}</span>
								</div>
							))}
						</div>
					</div>
				</section>
			</main>
			<div className="aliased flex flex-col items-center justify-center text-center flex-1">
				<h1 className="font-medium text-xl mb-4">Fumadocs on Tanstack Start.</h1>
				<Link
					to="/docs/$"
					params={{
						_splat: "",
					}}
					className="px-3 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm mx-auto"
				>
					Open Docs
				</Link>
			</div>
		</>
	);
}
