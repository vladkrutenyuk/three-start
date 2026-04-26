# Repository Overview

This repo contains three things in one place, kept together for easier sync and maintenance:

1. The library source code (`src/core`) — the `three-start` library itself.
2. The documentation site content (`content/docs`).
3. The marketing/home site and docs app (built on Fumadocs + TanStack Start).

## Layout

- `src/core/` — library source. Built separately via `vite.lib.config.ts` (`npm run build:lib`).
- `content/docs/` — MDX documentation. Static site generation is already wired up.
- `scripts/gen-api-docs.ts` — parses library sources and emits API type JSON.
- `content/docs/api/generated/` — generated API type data (do not edit by hand).

## Tech Stack

- **App framework:** Fumadocs + TanStack Start (project was scaffolded from this template).
- **Docs format:** MDX in `content/docs/`.
- **API docs:** custom source parser → custom JSON format → rendered with Fumadocs UI's type table.

## Key Commands

- `npm run dev` — dev server.
- `npm run build` — full build. Runs `prebuild` first, which regenerates API type JSON.
- `npm run build:lib` — build the library only (uses `vite.lib.config.ts`).
- `npm run docs:gen` / `npm run prebuild` — regenerate `content/docs/api/generated/` via `scripts/gen-api-docs.ts`.
- `npm run types:check` — type-check the project.
- `npm run lint` / `npm run format` — Biome.

## To Understand the Library

Read these first:

- [content/docs/index.mdx](content/docs/index.mdx)
- [content/docs/why.mdx](content/docs/why.mdx)
- [content/docs/advanced/internals.mdx](content/docs/advanced/internals.mdx)
- The source itself in [src/core/](src/core/)

## Notes for Agents

- When library API surface changes, the generated type JSON in `content/docs/api/generated/` will be refreshed automatically on the next build (or run `npm run docs:gen` manually).
- Do not hand-edit files under `content/docs/api/generated/`.
- Library code lives only in `src/core/`; everything else is the docs/site app.

## API Doc Generation Pipeline

> **Keep this section in sync with the code.** If you change anything that affects how the pipeline works — the extractor's filtering/extraction rules, the JSON schema, the renderer's components, the conventions for authoring source JSDoc — **update the corresponding subsection of this document in the same change**. This file is the contract for future agents and contributors; stale instructions here turn into bugs and wasted re-discoveries.

The API reference pages (`content/docs/api/*.mdx`) combine **hand-written intro prose** with **auto-generated tables** rendered by atomic `Api*` components. The pipeline has three stages:

```
src/core/<Class>.ts  ──┐
                       ├─→  scripts/gen-api-docs.ts  ──→  content/docs/api/generated/<Class>.json
                       │      (ts-morph + shiki)
                       │
content/docs/api/<class>.mdx  ──→  imports JSON  ──→  <ApiInit/ApiProperties/ApiMethods/...>
                                                       (src/components/ApiTable.tsx)
```

### Stage 1 — `scripts/gen-api-docs.ts` (extractor)

Run by `npm run docs:gen` and `prebuild`. Walks each target class with **ts-morph**, syntax-highlights every type with **shiki** (themes `github-light` / `github-dark`, matching Fumadocs defaults), and writes a JSON file per class.

**Targets** are declared in the `TARGETS` array at the top of the script:

```ts
{ file: 'src/core/ThreeStart.ts', cls: 'ThreeStart', excludeProps: [], hideInitialization?: boolean }
```

Add a new entry to expose a new class to the docs.

**What is extracted (per class):**

- `description` — class-level JSDoc.
- `generics` — formatted type-parameter string (e.g. `TEvents extends EventMap = {}`).
- `extends` — raw text of the heritage clause.
- `initializer` — only emitted when the class is **not abstract** AND `hideInitialization` is not set. Contains the full `new ClassName(params)` signature (highlighted) and the first-param type name (`optionsTypeName`).
- `constructorOptions` — fields of the first-param interface (e.g. `ThreeStartOptions`), with type, optionality, JSDoc description, and `@default` tags.
- `properties` — public fields and getters. Readonly is detected by absence of a same-named public setter for getters, or `readonly` modifier on fields. Arrow-function fields are skipped here (they go to `methods`).
- `methods` — public **and protected** methods + arrow-function fields (so `requestRender = () => {...}` shows up alongside regular methods). Protected members get `'protected'` automatically pushed onto their `tags` array.
- `lifecycle` — methods tagged with `@lifecycle` (separated into their own `Override methods` section).
- `events` — only when class extends `TypedEmitter<X>`. See "Events extraction" below.

**Filtering rules — what is dropped:**

- Anything whose JSDoc has `@internal`.
- Anything whose name starts with `_` (convention for private-by-name).
- `private` members (by TS modifier).
- Names listed in the target's `excludeProps`.
- Type-discriminator markers like `isThreeContext`, `isObject3DBehaviour` (excluded explicitly).
- The constructor param `options` field (kept for runtime, surfaced via `constructorOptions` instead).

> Note: `protected` members are **kept** and tagged. This is intentional — `TypedEmitter.emit` is `protected` but is part of the documented surface (subclasses call it). The badge `@protected` makes the visibility clear in the rendered table.

**Type-text normalization (`cleanType`):**

- `import("three").Foo` and `import("three/webgpu").Foo` → `THREE.Foo`
- `import("eventemitter3").<X>` → `EventEmitter`
- Other `import("...")` qualifiers stripped.

This keeps generated docs free of file-path noise.

**Events extraction (TypedEmitter detection):**

If a class extends `TypedEmitter<X>`:

1. **Generic case** — `X` is the class's own type parameter (e.g. `class ContextModule<TEvents> extends TypedEmitter<TEvents>`). The script sets `events.isGeneric = true`. The renderer uses `keyof TEvents` for the synthesized signatures; explanatory prose ("how to declare events on your subclass") lives in the MDX page itself, not in the renderer.
2. **Concrete case** — `X` resolves to a type alias in the same source file, e.g. `ThreeContextEventMap`. The script:
   - Walks the type-literal members (computed property keys like `[ThreeContextEvents.Update]`).
   - Resolves enum keys to literal values (so `update` shows up as the actual fired event name).
   - Collects all keys that share an enum into `keyTypeName` (e.g. `ThreeContextEvents`) — used in the synthesized `on`/`off`/`once` signatures.
   - Parses each value as a tuple type and extracts named tuple members as `{ name, type }` arg pairs.
   - Per-event description: prefers the JSDoc on the event-map property; falls back to the JSDoc on the **enum member** itself (so writing `/** Fired ... */ Update = "update"` once propagates to the docs).

In both cases, three **synthetic methods** (`on`, `off`, `once`) are added to `events.emitterMethods` with signatures pointing at the right key/payload type. They are NOT placed in `methods` — the renderer puts them inside the Events section.

### Stage 2 — `content/docs/api/generated/*.json`

Generated artifact, **never edited by hand**. Each file is one `ClassDoc`. Schema mirrors the interfaces declared at the top of `scripts/gen-api-docs.ts` and (intentionally) the same shape declared in `src/components/ApiTable.tsx`. If you change the schema, update both.

### Stage 3 — `src/components/ApiTable.tsx` (atomic renderers)

There is no monolithic `<ApiTable>` — it was removed in favour of small composable components, so MDX pages can interleave their own headings, prose, callouts, and code blocks between sections (and so the right-hand TOC works, since Fumadocs only picks up native `##` / `###` headings).

| Component | What it renders |
|---|---|
| `<ApiInit data={doc} />` | Highlighted constructor signature + `<TypeTable>` of `constructorOptions` (with the options type name as a sub-heading). Renders nothing for abstract classes or targets with `hideInitialization: true`. |
| `<ApiProperties data={doc} />` | `<TypeTable>` of public fields/getters; `readonly` shown as a token prefix on the type. Renders nothing if empty. |
| `<ApiMethods data={doc} />` | `<TypeTable>` of regular methods + arrow-function fields. Tags from JSDoc and `'protected'` marker render as `@tag` badges before the description. |
| `<ApiEmitterMethods data={doc} />` | Same as `<ApiMethods>` but uses **emitter-style rendering**: short `function` token in the type column, full signature in `typeDescription` (Fumadocs's expanded type detail). Used for classes whose every method has verbose generic signatures (i.e. `TypedEmitter`). |
| `<ApiLifecycle data={doc} />` | `<TypeTable>` of methods tagged `@lifecycle`. |
| `<ApiEvents data={doc} />` | Synthesized `on`/`off`/`once` rendered emitter-style; if `events.entries` is present, also a custom 2-column `<EventsTable>` (`Event | Details`) with semantic enum-token coloring on the keys (`enum` gray + `enumMember` green) and `args: name: type` shown in the Details cell. |

`<ApiEvents>` does **not** render any "how to declare events in your subclass" hint — that prose belongs in the page MDX, written as native markdown so it contributes to the TOC.

All `Api*` components are registered in [src/components/mdx.tsx](src/components/mdx.tsx); use them directly in MDX without imports.

**Description rendering (`renderDesc`):**

Descriptions support a tiny markdown subset:

- `` `code` `` → `<code>`
- `[text](url)` → clickable `<a>` (with backticks inside link text honored, e.g. `` [`ThreeContext`](/docs/api/three-context) ``)

This is what enables the "use markdown links to other classes" convention — see below.

### Conventions when authoring source JSDoc

- Every public class, field, getter, and method should have at least a one-line description. The renderer shows `(no description)` blanks otherwise.
- Use `@internal` to hide a member from both `.d.ts` (via `stripInternal: true`) and the API docs.
- Use `@default <value>` on options fields to populate the `default` column.
- Use `@deprecated` to flag deprecation; both `.d.ts` and the docs surface it.
- Use `@lifecycle` to put a method in the **Override methods** section instead of regular Methods (for `onAwake`, `onUpdate`, etc).
- `protected` members are auto-tagged `@protected` in the rendered table — no need to write the tag yourself.
- For events declared as an enum + computed-key event map, put each event's JSDoc on the enum member (`/** Fired when ... */ Update = "update"`) — the generator picks it up and surfaces it in the Details column of the events table.
- **Cross-link other documented classes** with markdown links: `` Owns a single [`ThreeContext`](/docs/api/three-context). `` The renderer turns these into `<a>` tags. Slugs match `content/docs/api/meta.json`:
  - `/docs/api/three-start`
  - `/docs/api/three-context`
  - `/docs/api/object3d-behaviour`
  - `/docs/api/context-module`
  - `/docs/api/typed-emitter`
  - `/docs/api/operations`

### Adding a new documented class

1. Add the entry to `TARGETS` in `scripts/gen-api-docs.ts`.
2. Create `content/docs/api/<slug>.mdx` with frontmatter + intro prose. Compose the page with `<ApiInit>`, `<ApiProperties>`, `<ApiMethods>` (or `<ApiEmitterMethods>` for emitter-style), `<ApiLifecycle>`, `<ApiEvents>` — under your own `## Heading`s for each section so they show up in the TOC.
3. Add `<slug>` to `content/docs/api/meta.json` `pages` array (controls sidebar order).
4. Run `npm run docs:gen` (or just `npm run dev` — `dev` runs `docs:gen` first).

### When the rendered output looks wrong

- **Description shows raw markdown** — the description was put through some other path; check that `renderDesc` is being called.
- **Type column says `any` or weird import path** — likely the source uses an inferred type. Add an explicit type annotation in source (e.g. on a getter return), or extend `cleanType` if it's a new external module.
- **A method is missing** — check it isn't `@internal`, doesn't start with `_`, isn't `private`, isn't in the target's `excludeProps`. (Protected methods are NOT filtered.)
- **Events section is missing** — class must `extends TypedEmitter<SomeMap>`. For an event-map table, `SomeMap` must be a type alias declared in the same source file; otherwise only the synthesized `on`/`off`/`once` table appears.
- **Synthetic `on`/`off`/`once` show wrong key type** — the script picks the enum name only when ALL computed keys share one enum. Mixed enums fall back to `keyof <MapTypeName>`.
- **TOC entry missing for a section** — Fumadocs only collects native markdown `##` / `###` headings. JSX `<h2>` inside a React component does not contribute. Write the heading in MDX, render the table component below it.

## MDX Authoring Conventions

The docs site is **Fumadocs UI**, which already provides rich styling and components for MDX. **Default to native MDX syntax and Fumadocs built-ins** — avoid custom React components unless the same UI needs to be reused 3+ places, or the behavior genuinely doesn't exist in Fumadocs. Custom components fragment styling and lose the typographic baseline that MDX prose relies on.

### Use built-in markdown first

- **Headings (`##`, `###`)** — Fumadocs auto-generates the right-hand TOC from these. Custom `<h2>` inside React components do NOT contribute to TOC. If you want a TOC entry, write a markdown heading.
- **Lists, links, paragraphs** — plain markdown. Already styled.
- **Tables** — plain GitHub-flavored markdown tables (`| Col | Col |`). Default table styling is already configured. Don't write `<table>` JSX unless you need cell spans / interactive cells.
- **Inline code** — `` `code` ``. Block code — fenced ``` with language tag.

### Code block annotations (Shiki transformers)

Fumadocs ships shiki transformers — annotate important parts of code via line comments inside the block:

````md
```ts
const result = pure(input);            // [!code highlight]
const cached = compute(input);         // [!code --]
const cached = computeMemoized(input); // [!code ++]
const x = doSomething();               // [!code focus]
const y = somethingElse();             // [!code warning]
const z = unsafeOp();                  // [!code error]
```

```ts title="filename.ts" {3,5-7}
// `title` adds a header; `{3,5-7}` highlights specific lines.
```
````

**Use these instead of prose explanations whenever possible** — readers' eyes go to the code, not the paragraph below. A `// [!code highlight]` on the critical line is worth three sentences of "and note that...".

### Callouts for important info

Use Fumadocs `<Callout>` for warnings, tips, gotchas, and notes — don't bury critical info in regular prose:

```mdx
<Callout type="warn">
  `addModules()` throws after `start()` — register everything beforehand.
</Callout>

<Callout type="info">Default renderer is `WebGPURenderer` with antialiasing.</Callout>

<Callout type="error">
  Calling `ctx.modules.foo = bar` throws — modules are read-only at runtime.
</Callout>
```

Types: `info` (default), `warn`, `error`. They render with appropriate color/icon and stand out visually.

### Available Fumadocs UI components

These are already wired up (or trivially importable from `fumadocs-ui/components/<name>` and registered via `src/components/mdx.tsx`):

| Component                            | Purpose                                                          |
|--------------------------------------|------------------------------------------------------------------|
| `<Callout>`                          | Notes / warnings / errors — use for emphasis.                    |
| `<Cards>` + `<Card>`                 | Grid of clickable links to other docs / external resources.      |
| `<Tabs>` + `<Tab>`                   | Swap between alternative code samples or platforms.              |
| `<Steps>` + `<Step>`                 | Numbered procedure (install → configure → run).                  |
| `<Accordions>` + `<Accordion>`       | Collapsible expandable detail.                                   |
| `<Files>` + `<File>` + `<Folder>`    | File-tree visualization.                                         |
| `<TypeTable>`                        | Used by the `Api*` components — only reach for it directly if you need a custom typed-row table outside the generated docs flow. |
| `<Banner>`                           | Top-of-page announcement.                                        |
| `<InlineTOC>`                        | Inline table of contents block inside the page body.             |

If something is in this list, **use it instead of writing JSX or custom CSS**.

### When to build a custom component

Build a new component in `src/components/` only if **all** are true:

- The same visual block recurs in 3+ pages (or will, soon).
- Fumadocs has nothing close.
- The block has internal logic (data-binding, generated content, interactivity) — pure decorative wrappers don't qualify.

The `Api*` components (`ApiInit`, `ApiProperties`, etc.) qualify because they consume generated JSON. `ThreeDemo` qualifies because it embeds a live Three.js canvas. A "fancy paragraph" or "boxed note" wrapper does not — use `<Callout>`.

### Authoring checklist

When writing or editing a doc page:

- [ ] Real `##` / `###` headings for sections you want in the right-hand TOC.
- [ ] Annotated code blocks (`[!code highlight]`, `[!code ++]`, line ranges, `title="..."`) to direct attention.
- [ ] `<Callout>` for warnings, gotchas, and critical info — don't hide them in prose.
- [ ] Markdown tables for tabular data (no `<table>` JSX unless you need spans / cells with logic).
- [ ] Cross-link other API pages with `[\`ClassName\`](/docs/api/slug)` (slugs listed in "Conventions when authoring source JSDoc" above).
- [ ] No inline `<div>` / `<span>` styling unless absolutely necessary — prose styles already cover it.

## Internal vs external visibility

There are three layers of "hidden":

| Layer                  | Mechanism                                | Effect                                                              |
|------------------------|------------------------------------------|---------------------------------------------------------------------|
| TypeScript compile     | `private` / `protected` / `#field`       | Other code can't access at type level.                              |
| Generated `.d.ts`      | `/** @internal */` + `stripInternal`     | Symbol disappears from published types — downstream users don't see it. |
| API docs               | `@internal` OR `_`-prefix OR `excludeProps` in target | Symbol doesn't appear on the docs page.                             |

`@internal` covers both .d.ts and docs. Use it as the default for cross-class plumbing that needs to be `public` for TS reasons but is not part of the user surface.
    