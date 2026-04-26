import { TypeTable } from "fumadocs-ui/components/type-table";
import type { TypeNode } from "fumadocs-ui/components/type-table";

// ── Types (mirrors scripts/gen-api-docs.ts schema) ───────────────────────────

export interface PropDoc {
	name: string;
	type: string;
	typeHtml: string;
	optional?: boolean;
	readonly?: boolean;
	deprecated?: boolean;
	description?: string;
	default?: string;
}

export interface MethodDoc {
	name: string;
	params: Array<{ name: string; type: string; typeHtml: string; optional?: boolean }>;
	returns: string;
	returnsHtml: string;
	signature: string;
	signatureHtml: string;
	deprecated?: boolean;
	description?: string;
	tags: string[];
}

export interface EventDoc {
	name: string;
	key: string;
	keyHtml: string;
	value: string;
	args: Array<{ name: string; type: string; typeHtml: string; optional?: boolean }>;
	description?: string;
}

export interface InitializerDoc {
	signature: string;
	signatureHtml: string;
	optionsTypeName?: string;
}

export interface EventsDoc {
	mapTypeName?: string;
	keyTypeName?: string;
	isGeneric?: boolean;
	emitterMethods: MethodDoc[];
	entries?: EventDoc[];
}

export interface ClassDoc {
	name: string;
	description?: string;
	generics?: string;
	extends?: string;
	initializer?: InitializerDoc;
	constructorOptions?: PropDoc[];
	properties?: PropDoc[];
	methods?: MethodDoc[];
	lifecycle?: MethodDoc[];
	events?: EventsDoc;
}

// ── Renderers ─────────────────────────────────────────────────────────────────

// Renders a type string with shiki token HTML if available,
// falling back to a plain <code> element.
// The .shiki class triggers fumadocs-ui's CSS: .shiki code span { color: var(--shiki-light) }
function TypeCode({ type, typeHtml }: { type: string; typeHtml: string }) {
	if (typeHtml) {
		return (
			<span className="shiki font-mono text-sm">
				{/* eslint-disable-next-line react/no-danger */}
				<code dangerouslySetInnerHTML={{ __html: typeHtml }} />
			</span>
		);
	}
	return <code className="font-mono text-sm">{type}</code>;
}

// Renders description text with:
//   - `backtick code` → <code>
//   - [text](url) → <a> (with backticks inside link text honored)
function renderDesc(text: string): React.ReactNode {
	const TOKEN_RE = /\[([^\]]+)\]\(([^)]+)\)|(`[^`]+`)/g;
	const parts: React.ReactNode[] = [];
	let lastIdx = 0;
	let m: RegExpExecArray | null;
	TOKEN_RE.lastIndex = 0;
	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop pattern
	while ((m = TOKEN_RE.exec(text))) {
		if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
		if (m[1] !== undefined && m[2] !== undefined) {
			const linkText = m[1];
			const href = m[2];
			parts.push(
				<a
					key={`l${m.index}`}
					href={href}
					className="underline underline-offset-2 decoration-fd-muted-foreground/50 hover:decoration-fd-foreground"
				>
					{linkText.startsWith("`") && linkText.endsWith("`") ? (
						<code>{linkText.slice(1, -1)}</code>
					) : (
						linkText
					)}
				</a>
			);
		} else if (m[3]) {
			parts.push(<code key={`c${m.index}`}>{m[3].slice(1, -1)}</code>);
		}
		lastIdx = TOKEN_RE.lastIndex;
	}
	if (lastIdx < text.length) parts.push(text.slice(lastIdx));
	if (parts.length === 0) return text;
	if (parts.length === 1) return parts[0];
	return <>{parts}</>;
}

// ── Converters ────────────────────────────────────────────────────────────────

function optionsToTypeTable(rows: PropDoc[]): Record<string, TypeNode> {
	return Object.fromEntries(
		rows.map((row) => {
			const node: TypeNode = {
				type: <TypeCode type={row.type} typeHtml={row.typeHtml} />,
				required: !row.optional,
				deprecated: row.deprecated,
			};
			if (row.description) node.description = renderDesc(row.description);
			if (row.default !== undefined)
				node.default = <code className="font-mono text-sm">{row.default}</code>;
			return [row.name, node];
		})
	);
}

function propsToTypeTable(rows: PropDoc[]): Record<string, TypeNode> {
	return Object.fromEntries(
		rows.map((row) => {
			const typeText = row.readonly ? `readonly ${row.type}` : row.type;
			// For readonly, prepend "readonly " to the HTML
			const typeHtml = row.readonly
				? `<span style="--shiki-light:#D73A49;--shiki-dark:#F97583">readonly </span>${row.typeHtml}`
				: row.typeHtml;
			const node: TypeNode = {
				type: <TypeCode type={typeText} typeHtml={typeHtml} />,
				required: true,
				deprecated: row.deprecated,
			};
			if (row.description) node.description = renderDesc(row.description);
			if (row.default !== undefined)
				node.default = <code className="font-mono text-sm">{row.default}</code>;
			return [row.name, node];
		})
	);
}

function TagBadges({ tags }: { tags: string[] }) {
	if (tags.length === 0) return null;
	return (
		<>
			{tags.map((tag) => (
				<code key={tag} className="font-mono text-xs opacity-60 mr-1">
					@{tag}
				</code>
			))}
		</>
	);
}

/**
 * Variant of `methodsToTypeTable` for `on`/`off`/`once`. Their full signatures
 * (`<K extends EventKey>(event: K, fn: (...args: Map[K]) => void, context?: any) => this`)
 * are too noisy in the short `type` column — keep the column to a short `function`
 * token and put the full signature in `typeDescription` (Fumadocs renders it as the
 * expanded type detail).
 */
function emitterMethodsToTypeTable(rows: MethodDoc[]): Record<string, TypeNode> {
	return Object.fromEntries(
		rows.map((row) => {
			const descNode = (
				<>
					{row.tags.length > 0 && <TagBadges tags={row.tags} />}
					{row.description ? (
						row.tags.length > 0 ? (
							<> — {renderDesc(row.description)}</>
						) : (
							renderDesc(row.description)
						)
					) : null}
				</>
			);
			const node: TypeNode = {
				type: <code className="font-mono text-sm">function</code>,
				typeDescription: (
					<TypeCode type={row.signature} typeHtml={row.signatureHtml} />
				),
				required: true,
				deprecated: row.deprecated,
			};
			if (row.tags.length > 0 || row.description) node.description = descNode;
			if (row.params.length > 0) {
				node.parameters = row.params.map((p) => ({
					name: `${p.name}${p.optional ? "?" : ""}`,
					description: <TypeCode type={p.type} typeHtml={p.typeHtml} />,
				}));
			}
			if (row.returns !== "void")
				node.returns = (
					<TypeCode type={row.returns} typeHtml={row.returnsHtml} />
				);
			return [row.name, node];
		}),
	);
}

function methodsToTypeTable(rows: MethodDoc[]): Record<string, TypeNode> {
	return Object.fromEntries(
		rows.map((row) => {
			const descNode = (
				<>
					{row.tags.length > 0 && <TagBadges tags={row.tags} />}
					{row.description ? (
						row.tags.length > 0 ? (
							<> — {renderDesc(row.description)}</>
						) : (
							renderDesc(row.description)
						)
					) : null}
				</>
			);
			const node: TypeNode = {
				type: <TypeCode type={row.signature} typeHtml={row.signatureHtml} />,
				required: true,
				deprecated: row.deprecated,
			};
			if (row.tags.length > 0 || row.description) node.description = descNode;
			if (row.params.length > 0) {
				node.parameters = row.params.map((p) => ({
					name: `${p.name}${p.optional ? "?" : ""}`,
					description: <TypeCode type={p.type} typeHtml={p.typeHtml} />,
				}));
			}
			if (row.returns !== "void")
				node.returns = <TypeCode type={row.returns} typeHtml={row.returnsHtml} />;
			return [row.name, node];
		})
	);
}

// ── Events table ──────────────────────────────────────────────────────────────

// Semantic-token colors matching the user's editor preference:
//   enum       → muted gray
//   enumMember → green
const ENUM_COLOR = "#abb2bfa6";
const ENUM_MEMBER_COLOR = "#98C379";

function EventKey({ row }: { row: EventDoc }) {
	const dot = row.key.lastIndexOf(".");
	if (dot > 0) {
		const enumName = row.key.slice(0, dot);
		const member = row.key.slice(dot + 1);
		return (
			<code className="font-mono text-sm whitespace-nowrap">
				<span style={{ color: ENUM_COLOR }}>{enumName}.</span>
				<span style={{ color: ENUM_MEMBER_COLOR }}>{member}</span>
			</code>
		);
	}
	return (
		<code
			className="font-mono text-sm whitespace-nowrap"
			style={{ color: ENUM_MEMBER_COLOR }}
		>
			{row.key}
		</code>
	);
}

function ArgsList({ args }: { args: EventDoc["args"] }) {
	if (args.length === 0) return null;
	return (
		<div className="mt-1 shiki font-mono text-xs">
			<span className="text-fd-muted-foreground">args: </span>
			{args.map((a, i) => (
				<span key={a.name}>
					{i > 0 && <span>, </span>}
					<span className="text-fd-foreground/80">
						{a.name}
						{a.optional ? "?" : ""}:{" "}
					</span>
					{/* eslint-disable-next-line react/no-danger */}
					<code dangerouslySetInnerHTML={{ __html: a.typeHtml }} />
				</span>
			))}
		</div>
	);
}

function EventsTable({ rows }: { rows: EventDoc[] }) {
	return (
		<table className="w-full border-collapse text-sm">
			<thead>
				<tr>
					<th>Event</th>
					<th>Details</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.key}>
						<td className="align-top pr-4">
							<EventKey row={row} />
						</td>
						<td className="align-top">
							{row.description ? (
								<div className="text-fd-foreground">
									{renderDesc(row.description)}
								</div>
							) : (
								<div className="text-fd-muted-foreground italic">
									no description
								</div>
							)}
							<ArgsList args={row.args} />
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

// ── Composable section components ────────────────────────────────────────────

/**
 * Initialization section — constructor signature code block + options TypeTable.
 * Renders nothing if the class has no initializer (e.g. abstract bases).
 */
export function ApiInit({ data }: { data: ClassDoc }) {
	if (!data.initializer) return null;
	return (
		<>
			<pre className="shiki">
				<code
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={{ __html: data.initializer.signatureHtml }}
				/>
			</pre>
			{data.initializer.optionsTypeName &&
				data.constructorOptions &&
				data.constructorOptions.length > 0 && (
					<>
						<h4>{data.initializer.optionsTypeName}</h4>
						<TypeTable type={optionsToTypeTable(data.constructorOptions)} />
					</>
				)}
		</>
	);
}

/** Properties TypeTable. Renders nothing if no public properties. */
export function ApiProperties({ data }: { data: ClassDoc }) {
	if (!data.properties || data.properties.length === 0) return null;
	return <TypeTable type={propsToTypeTable(data.properties)} />;
}

/** Regular methods TypeTable. Renders nothing if no public methods. */
export function ApiMethods({ data }: { data: ClassDoc }) {
	if (!data.methods || data.methods.length === 0) return null;
	return <TypeTable type={methodsToTypeTable(data.methods)} />;
}

/**
 * Methods rendered in emitter-style: short `function` token in the type column,
 * full signature shown via `typeDescription`. Use for classes where every method
 * has a verbose generic signature (e.g. `TypedEmitter`).
 */
export function ApiEmitterMethods({ data }: { data: ClassDoc }) {
	if (!data.methods || data.methods.length === 0) return null;
	return <TypeTable type={emitterMethodsToTypeTable(data.methods)} />;
}

/** Lifecycle / `@lifecycle`-tagged methods TypeTable. Renders nothing if none. */
export function ApiLifecycle({ data }: { data: ClassDoc }) {
	if (!data.lifecycle || data.lifecycle.length === 0) return null;
	return <TypeTable type={methodsToTypeTable(data.lifecycle)} />;
}

/**
 * Events section content — `on`/`off`/`once` table and (for concrete event maps)
 * the event-map table. Renders nothing if the class doesn't extend `TypedEmitter`.
 *
 * For abstract bases (`isGeneric: true`), the "how to declare events" guidance
 * is written directly in MDX — this component intentionally does not render it.
 */
export function ApiEvents({ data }: { data: ClassDoc }) {
	if (!data.events) return null;
	return (
		<>
			<TypeTable type={emitterMethodsToTypeTable(data.events.emitterMethods)} />
			{data.events.entries && data.events.entries.length > 0 && (
				<>
					{data.events.mapTypeName && <h4>{data.events.mapTypeName}</h4>}
					<EventsTable rows={data.events.entries} />
				</>
			)}
		</>
	);
}
