/**
 * Server-side helper that turns a generated ClassDoc JSON
 * (from `content/docs/api/generated/<ClassName>.json`) into plain markdown.
 *
 * Used by `getLLMText` to expand `<ApiInit/>` / `<ApiProperties/>` / etc.
 * MDX components inline so `/llms-full.txt` and `/llms.mdx/docs/api/<page>`
 * carry actual API content for downstream LLM consumers, instead of leaving
 * the JSX tags un-rendered as the default `getText('processed')` does.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

interface Param {
  name: string;
  type: string;
}

interface Field {
  name: string;
  type?: string;
  optional?: boolean;
  default?: string;
  description?: string;
  tags?: string[];
}

interface Method {
  name: string;
  params?: Param[];
  returns?: string;
  signature?: string;
  tags?: string[];
  description?: string;
}

interface EventEntry {
  name: string;
  key?: string;
  value?: string;
  args?: Param[];
  description?: string;
}

interface ClassDoc {
  name: string;
  description?: string;
  generics?: string;
  extends?: string;
  initializer?: { signature: string; optionsTypeName?: string };
  constructorOptions?: Field[];
  properties?: Field[];
  methods?: Method[];
  lifecycle?: Method[];
  events?: {
    isGeneric?: boolean;
    keyTypeName?: string;
    mapTypeName?: string;
    entries?: EventEntry[];
    emitterMethods?: Method[];
  };
  hideInitialization?: boolean;
}

const GENERATED_DIR = path.resolve(process.cwd(), 'content/docs/api/generated');
const API_PAGES_DIR = path.resolve(process.cwd(), 'content/docs/api');

/**
 * Look at the page's MDX source on disk and pull the ClassDoc JSON it imports
 * (`import doc from './generated/X.json'`). Returns null if the page doesn't
 * import a generated doc (e.g. `operations.mdx` is hand-written).
 */
async function loadDocForSlug(slug: string): Promise<ClassDoc | null> {
  const mdxPath = path.join(API_PAGES_DIR, `${slug}.mdx`);
  let raw: string;
  try {
    raw = await fs.readFile(mdxPath, 'utf8');
  } catch {
    return null;
  }
  const importMatch = raw.match(
    /import\s+doc\s+from\s+['"]\.\/generated\/(\w+)\.json['"]/
  );
  if (!importMatch) return null;
  const className = importMatch[1];
  const jsonPath = path.join(GENERATED_DIR, `${className}.json`);
  try {
    const content = await fs.readFile(jsonPath, 'utf8');
    return JSON.parse(content) as ClassDoc;
  } catch {
    return null;
  }
}

/** Match `<ApiX />` or `<ApiX data={doc} />` (self-closing JSX, any attrs). */
const API_TAG_RE = /<(Api[A-Za-z]+)\b[^>]*\/>/g;

/**
 * Replace every `<Api*>` JSX tag in `text` with a markdown rendering of the
 * corresponding section from `doc`. Pages that don't have a JSON peer (or
 * use no `<Api*>` tags) are returned unchanged.
 */
export async function expandApiTags(slug: string, text: string): Promise<string> {
  if (!API_TAG_RE.test(text)) return text;
  // Reset lastIndex after the test() above.
  API_TAG_RE.lastIndex = 0;

  const doc = await loadDocForSlug(slug);
  if (!doc) return text;

  return text.replace(API_TAG_RE, (_match, name: string) => {
    const renderer = RENDERERS[name];
    return renderer ? renderer(doc) : '';
  });
}

// ─── Renderers ──────────────────────────────────────────────────────────────

const RENDERERS: Record<string, (doc: ClassDoc) => string> = {
  ApiInit: renderInit,
  ApiProperties: (d) => renderFieldRows(d.properties),
  ApiMethods: (d) => renderMethodRows(d.methods),
  ApiEmitterMethods: (d) => renderMethodRows(d.events?.emitterMethods),
  ApiLifecycle: (d) => renderMethodRows(d.lifecycle),
  ApiEvents: renderEvents,
};

function renderInit(doc: ClassDoc): string {
  if (doc.hideInitialization || !doc.initializer) return '';
  const lines: string[] = [];
  lines.push('```ts', doc.initializer.signature, '```');
  if (doc.constructorOptions?.length) {
    if (doc.initializer.optionsTypeName) {
      lines.push('', `**\`${doc.initializer.optionsTypeName}\`**`);
    }
    lines.push('');
    lines.push('| Field | Type | Default | Description |');
    lines.push('|---|---|---|---|');
    for (const f of doc.constructorOptions) {
      const name = `\`${f.name}${f.optional ? '?' : ''}\``;
      const type = f.type ? `\`${oneLine(f.type)}\`` : '—';
      const def = f.default ? `\`${f.default}\`` : '—';
      const desc = oneLine(f.description ?? '');
      lines.push(`| ${name} | ${type} | ${def} | ${escapePipes(desc)} |`);
    }
  }
  return lines.join('\n');
}

function renderFieldRows(fields?: Field[]): string {
  if (!fields?.length) return '';
  const lines: string[] = [];
  lines.push('| Name | Type | Description |');
  lines.push('|---|---|---|');
  for (const f of fields) {
    const tagPrefix =
      f.tags?.length ? f.tags.map((t) => `\`@${t}\``).join(' ') + ' ' : '';
    const name = `\`${f.name}${f.optional ? '?' : ''}\``;
    const type = f.type ? `\`${oneLine(f.type)}\`` : '—';
    const desc = tagPrefix + oneLine(f.description ?? '');
    lines.push(`| ${name} | ${type} | ${escapePipes(desc)} |`);
  }
  return lines.join('\n');
}

function renderMethodRows(methods?: Method[]): string {
  if (!methods?.length) return '';
  const lines: string[] = [];
  lines.push('| Name | Type | Description |');
  lines.push('|---|---|---|');
  for (const m of methods) {
    const tagPrefix =
      m.tags?.length ? m.tags.map((t) => `\`@${t}\``).join(' ') + ' ' : '';
    const name = `\`${m.name}\``;
    const sig = m.signature ?? buildSignature(m);
    const type = sig ? `\`${oneLine(sig)}\`` : '—';
    const desc = tagPrefix + oneLine(m.description ?? '');
    lines.push(`| ${name} | ${type} | ${escapePipes(desc)} |`);
  }
  return lines.join('\n');
}

function renderEvents(doc: ClassDoc): string {
  const e = doc.events;
  if (!e) return '';
  const lines: string[] = [];

  if (e.emitterMethods?.length) {
    lines.push('**Emitter methods**', '');
    lines.push(renderMethodRows(e.emitterMethods));
  }

  if (e.entries?.length) {
    if (lines.length) lines.push('');
    lines.push('**Events**', '');
    lines.push('| Event | String key | Args | Description |');
    lines.push('|---|---|---|---|');
    for (const entry of e.entries) {
      const name = entry.key ? `\`${entry.key}\`` : `\`${entry.name}\``;
      const value = entry.value ? `\`"${entry.value}"\`` : '—';
      const args =
        entry.args?.length
          ? entry.args
              .map((a) => `\`${a.name}: ${oneLine(a.type)}\``)
              .join(', ')
          : '—';
      const desc = oneLine(entry.description ?? '');
      lines.push(`| ${name} | ${value} | ${args} | ${escapePipes(desc)} |`);
    }
  }

  return lines.join('\n');
}

// ─── utils ──────────────────────────────────────────────────────────────────

function buildSignature(m: Method): string {
  const params = (m.params ?? [])
    .map((p) => `${p.name}: ${oneLine(p.type)}`)
    .join(', ');
  return `(${params}) => ${m.returns ?? 'void'}`;
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Pipes break GitHub markdown tables; escape them in cell content. */
function escapePipes(s: string): string {
  return s.replace(/\|/g, '\\|');
}
