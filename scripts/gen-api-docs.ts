/**
 * Generates API documentation JSON files from TypeScript source classes.
 * Output: content/docs/api/generated/<ClassName>.json
 *
 * Run: npm run docs:gen
 */

import { Project, Node, Scope } from 'ts-morph';
import { createHighlighter } from 'shiki';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Schema ───────────────────────────────────────────────────────────────────

interface PropDoc {
  name: string;
  type: string;
  typeHtml: string;
  optional?: boolean;
  readonly?: boolean;
  deprecated?: boolean;
  description?: string;
  default?: string;
}

interface ParamDoc {
  name: string;
  type: string;
  typeHtml: string;
  optional?: boolean;
}

interface MethodDoc {
  name: string;
  params: ParamDoc[];
  returns: string;
  returnsHtml: string;
  /** Full function type: "(param: Type) => ReturnType" */
  signature: string;
  signatureHtml: string;
  deprecated?: boolean;
  description?: string;
  /** JSDoc tags like "lifecycle", "override" */
  tags: string[];
}

interface EventDoc {
  /** Enum member name if the key is an enum (e.g., "Update"); otherwise the literal key */
  name: string;
  /** Reference text used in the event map (e.g., "ThreeContextEvents.Update" or "\"update\"") */
  key: string;
  keyHtml: string;
  /** Resolved literal value of the key (e.g., "update") */
  value: string;
  args: ParamDoc[];
  description?: string;
}

interface InitializerDoc {
  /** Full signature like "new ThreeStart(options?: ThreeStartOptions)" */
  signature: string;
  signatureHtml: string;
  /** Name of the options type (e.g., "ThreeStartOptions"), if the ctor has one */
  optionsTypeName?: string;
}

interface EventsDoc {
  /** Name of the event map type (e.g., "ThreeContextEventMap") */
  mapTypeName?: string;
  /** Name of the key type if all keys share an enum (e.g., "ThreeContextEvents") */
  keyTypeName?: string;
  /** True when the event map is a class generic parameter (abstract base) */
  isGeneric?: boolean;
  /** Synthetic `on`/`off`/`once` methods from TypedEmitter */
  emitterMethods: MethodDoc[];
  /** Resolved event entries if the event map is a concrete type alias */
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

// ── Targets ──────────────────────────────────────────────────────────────────

interface Target {
  file: string;
  cls: string;
  excludeProps: string[];
  /** Hide the Initialization section (class is not user-instantiated) */
  hideInitialization?: boolean;
}

const TARGETS: Target[] = [
  {
    file: 'src/core/ThreeStart.ts',
    cls: 'ThreeStart',
    excludeProps: [],
  },
  {
    file: 'src/core/ThreeContext.ts',
    cls: 'ThreeContext',
    // 'isThreeContext' is a type-discriminator marker, not useful in docs
    // 'options' is a readonly constructor param property; user doesn't instantiate this class
    excludeProps: ['isThreeContext', 'options'],
    hideInitialization: true,
  },
  {
    file: 'src/core/ContextModule.ts',
    cls: 'ContextModule',
    excludeProps: [],
  },
  {
    file: 'src/core/Object3DBehaviour.ts',
    cls: 'Object3DBehaviour',
    // 'isObject3DBehaviour' is a type-discriminator marker
    excludeProps: ['isObject3DBehaviour'],
  },
  {
    file: 'src/core/TypedEmitter.ts',
    cls: 'TypedEmitter',
    excludeProps: [],
    // Users extend it (don't instantiate), so no Initialization section
    hideInitialization: true,
  },
];

// ── Shiki ─────────────────────────────────────────────────────────────────────
// Same themes/config as fumadocs-core defaults (utils-BqbZbgRr.js)

const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: ['typescript'],
});

function highlightType(code: string): string {
  try {
    const html = highlighter.codeToHtml(code, {
      lang: 'typescript',
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    });
    // Extract token spans from inside <span class="line">...</span>
    // Structure: <pre>...<code><span class="line">TOKENS</span>\n</code></pre>
    const lineTag = '<span class="line">';
    const lineStart = html.indexOf(lineTag);
    if (lineStart === -1) return '';
    const contentStart = lineStart + lineTag.length;
    // The line span's closing </span> is the last one before </code>
    const codeClose = html.indexOf('</code>');
    const lineClose = html.lastIndexOf('</span>', codeClose);
    return html.slice(contentStart, lineClose);
  } catch {
    return '';
  }
}

// ── ts-morph helpers ──────────────────────────────────────────────────────────

function cleanType(text: string): string {
  return text
    .replace(/import\(['"]three(?:\/webgpu)?['"]\)\./g, 'THREE.')
    .replace(/import\(['"]eventemitter3['"]\)\.\w+/g, 'EventEmitter')
    .replace(/import\(['""][^'"]+['"]\)\./g, '');
}

function getDesc(node: Node): string | undefined {
  if (!Node.isJSDocable(node)) return undefined;
  for (const doc of node.getJsDocs()) {
    const text = doc.getDescription().trim();
    if (text) return text;
  }
  return undefined;
}

function getDefaultVal(node: Node): string | undefined {
  if (!Node.isJSDocable(node)) return undefined;
  for (const doc of node.getJsDocs()) {
    for (const tag of doc.getTags()) {
      if (tag.getTagName() === 'default') {
        return tag.getCommentText()?.trim();
      }
    }
  }
  return undefined;
}

function checkInternal(node: Node): boolean {
  if (!Node.isJSDocable(node)) return false;
  for (const doc of node.getJsDocs()) {
    for (const tag of doc.getTags()) {
      if (tag.getTagName() === 'internal') return true;
    }
  }
  return false;
}

function checkDeprecated(node: Node): boolean {
  if (!Node.isJSDocable(node)) return false;
  for (const doc of node.getJsDocs()) {
    for (const tag of doc.getTags()) {
      if (tag.getTagName() === 'deprecated') return true;
    }
  }
  return false;
}

/** Returns all custom JSDoc tag names (e.g. ["lifecycle", "override"]) */
function getDocTags(node: Node): string[] {
  if (!Node.isJSDocable(node)) return [];
  const tags: string[] = [];
  for (const doc of node.getJsDocs()) {
    for (const tag of doc.getTags()) {
      const name = tag.getTagName();
      // skip standard tags handled elsewhere
      if (['internal', 'deprecated', 'default', 'param', 'returns'].includes(name)) continue;
      tags.push(name);
    }
  }
  return tags;
}

function buildSignature(params: ParamDoc[], returns: string): string {
  const paramStr = params
    .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
    .join(', ');
  return `(${paramStr}) => ${returns}`;
}

function getPropTypeText(node: Node): string {
  if (Node.isPropertyDeclaration(node)) {
    const typeNode = node.getTypeNode();
    if (typeNode) return typeNode.getText();
    return cleanType(node.getType().getText(node));
  }
  if (Node.isGetAccessorDeclaration(node)) {
    const retNode = node.getReturnTypeNode();
    if (retNode) return retNode.getText();
    return cleanType(node.getReturnType().getText(node));
  }
  if (Node.isPropertySignature(node)) {
    const typeNode = node.getTypeNode();
    if (typeNode) return typeNode.getText();
    return cleanType(node.getType().getText(node));
  }
  return '';
}

function getMethodReturnText(method: Node): string {
  if (Node.isMethodDeclaration(method)) {
    const retNode = method.getReturnTypeNode();
    if (retNode) return retNode.getText();
    return cleanType(method.getReturnType().getText(method));
  }
  return 'void';
}

function getParamTypeText(param: Node): string {
  if (Node.isParameterDeclaration(param)) {
    const typeNode = param.getTypeNode();
    if (typeNode) return typeNode.getText();
    return cleanType(param.getType().getText(param));
  }
  return 'unknown';
}

// ── Generator ────────────────────────────────────────────────────────────────

const project = new Project({
  tsConfigFilePath: resolve(ROOT, 'tsconfig.json'),
});

const OUT_DIR = resolve(ROOT, 'content/docs/api/generated');
mkdirSync(OUT_DIR, { recursive: true });

for (const target of TARGETS) {
  const sourceFile = project.getSourceFileOrThrow(resolve(ROOT, target.file));
  const cls = sourceFile.getClassOrThrow(target.cls);

  const doc: ClassDoc = { name: target.cls };

  const clsDesc = getDesc(cls);
  if (clsDesc) doc.description = clsDesc;

  // Generics
  const typeParams = cls.getTypeParameters();
  if (typeParams.length > 0) {
    doc.generics = typeParams
      .map(tp => {
        let s = tp.getName();
        const constraint = tp.getConstraint();
        const def = tp.getDefault();
        if (constraint) s += ` extends ${constraint.getText()}`;
        if (def) s += ` = ${def.getText()}`;
        return s;
      })
      .join(', ');
  }

  const extExpr = cls.getExtends();
  if (extExpr) doc.extends = extExpr.getText();

  // ── Initializer (constructor signature) + options ─────────────────────────
  const ctor = cls.getConstructors()[0];
  if (ctor && !cls.isAbstract() && !target.hideInitialization) {
    const ctorParams = ctor.getParameters();
    const paramStrs = ctorParams.map(p => {
      const type = p.getTypeNode()?.getText() ?? cleanType(p.getType().getText(p));
      // Treat params with default values as optional in the signature
      const isOptional = p.hasQuestionToken() || p.hasInitializer();
      return `${p.getName()}${isOptional ? '?' : ''}: ${type}`;
    });
    const signature = `new ${target.cls}(${paramStrs.join(', ')})`;
    const firstParam = ctorParams[0];
    const optionsTypeName = firstParam?.getTypeNode()?.getText();
    doc.initializer = {
      signature,
      signatureHtml: highlightType(signature),
      ...(optionsTypeName ? { optionsTypeName } : {}),
    };

    // Expand first-param options interface (same as before)
    if (firstParam) {
      const paramTypeName = firstParam.getTypeNode()?.getText();
      if (paramTypeName) {
        const optIface = sourceFile.getInterface(paramTypeName);
        if (optIface) {
          doc.constructorOptions = optIface
            .getProperties()
            .filter(p => !checkInternal(p) && !p.getName().startsWith('_'))
            .map(p => {
              const type = getPropTypeText(p);
              const entry: PropDoc = { name: p.getName(), type, typeHtml: highlightType(type) };
              if (p.hasQuestionToken()) entry.optional = true;
              const desc = getDesc(p);
              if (desc) entry.description = desc;
              const def = getDefaultVal(p);
              if (def) entry.default = def;
              if (checkDeprecated(p)) entry.deprecated = true;
              return entry;
            });
        }
      }
    }
  }

  // ── Events (TypedEmitter<MapType>) ─────────────────────────────────────────
  const extText = extExpr?.getText() ?? '';
  const mapTypeMatch = /^TypedEmitter<([^<>]+)>$/.exec(extText);
  const mapTypeName = mapTypeMatch?.[1]?.trim();
  const isBaseTypedEmitter = !!extExpr && /^TypedEmitter</.test(extText);

  // Detect whether the map type is a generic parameter of the class itself
  // (e.g., `class ContextModule<TEvents> extends TypedEmitter<TEvents>`).
  const classTypeParamNames = new Set(cls.getTypeParameters().map(tp => tp.getName()));
  const isGenericMap = !!mapTypeName && classTypeParamNames.has(mapTypeName);

  let eventEntries: EventDoc[] | undefined;
  let eventKeyTypeName: string | undefined;
  let resolvedMapTypeName: string | undefined;

  if (mapTypeName && !isGenericMap) {
    // Try to resolve as a type alias in the same source file
    const alias = sourceFile.getTypeAlias(mapTypeName);
    if (alias) {
      const typeNode = alias.getTypeNode();
      if (typeNode && Node.isTypeLiteral(typeNode)) {
        const entries: EventDoc[] = [];
        const keyTypeNames = new Set<string>();

        for (const prop of typeNode.getProperties()) {
          // Computed key like [ThreeContextEvents.Update] or literal
          const nameNode = prop.getNameNode();
          const nameText = nameNode.getText();

          let keyRef = nameText;
          let memberName = nameText;
          let literalValue = nameText;

          // Unwrap computed key: "[ThreeContextEvents.Update]" → "ThreeContextEvents.Update"
          if (keyRef.startsWith('[') && keyRef.endsWith(']')) {
            keyRef = keyRef.slice(1, -1).trim();
          }

          // If it's EnumName.Member, extract parts and try to resolve literal
          const enumMatch = /^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/.exec(keyRef);
          let enumMemberDesc: string | undefined;
          if (enumMatch) {
            keyTypeNames.add(enumMatch[1]);
            memberName = enumMatch[2];
            const enumDecl = sourceFile.getEnum(enumMatch[1]);
            const member = enumDecl?.getMember(enumMatch[2]);
            const val = member?.getValue();
            if (typeof val === 'string') literalValue = val;
            else if (typeof val === 'number') literalValue = String(val);
            else literalValue = keyRef;
            // Pull JSDoc off the enum member itself (e.g. `/** Fired ... */ Update = "update"`)
            if (member) enumMemberDesc = getDesc(member);
          } else {
            // String literal key like "'update'"
            const lit = /^['"](.+)['"]$/.exec(keyRef);
            if (lit) {
              memberName = lit[1];
              literalValue = lit[1];
            } else {
              memberName = keyRef;
              literalValue = keyRef;
            }
          }

          // Parse value as a tuple of args
          const valueNode = prop.getTypeNode();
          const args: ParamDoc[] = [];
          if (valueNode && Node.isTupleTypeNode(valueNode)) {
            valueNode.getElements().forEach((el, i) => {
              let argName = `arg${i}`;
              let argType = cleanType(el.getText());
              if (Node.isNamedTupleMember(el)) {
                argName = el.getName();
                argType = cleanType(el.getTypeNode().getText());
              }
              args.push({
                name: argName,
                type: argType,
                typeHtml: highlightType(argType),
              });
            });
          }

          // Prefer JSDoc on the event-map property; fall back to the enum-member JSDoc
          const desc = getDesc(prop) ?? enumMemberDesc;
          entries.push({
            name: memberName,
            key: keyRef,
            keyHtml: highlightType(keyRef),
            value: literalValue,
            args,
            ...(desc ? { description: desc } : {}),
          });
        }

        eventEntries = entries;
        resolvedMapTypeName = mapTypeName;
        if (keyTypeNames.size === 1) eventKeyTypeName = [...keyTypeNames][0];
      }
    }
  }

  // ── Properties ────────────────────────────────────────────────────────────
  const props: PropDoc[] = [];
  const excluded = new Set(target.excludeProps);

  // Getters (readonly only if there's no corresponding public setter)
  const setterNames = new Set(
    cls.getSetAccessors()
      .filter(s => s.getScope() === Scope.Public)
      .map(s => s.getName()),
  );

  for (const getter of cls.getGetAccessors()) {
    const name = getter.getName();
    if (excluded.has(name)) continue;
    if (name.startsWith('_')) continue;
    if (getter.getScope() !== Scope.Public) continue;
    if (checkInternal(getter)) continue;

    const type = getPropTypeText(getter);
    const entry: PropDoc = {
      name,
      type,
      typeHtml: highlightType(type),
      readonly: setterNames.has(name) ? undefined : true,
    };
    const desc = getDesc(getter);
    if (desc) entry.description = desc;
    if (checkDeprecated(getter)) entry.deprecated = true;
    props.push(entry);
  }

  // Public fields (non-function-typed)
  for (const prop of cls.getProperties()) {
    const name = prop.getName();
    if (excluded.has(name)) continue;
    if (name.startsWith('_')) continue;
    const scope = prop.getScope();
    if (scope === Scope.Private || scope === Scope.Protected) continue;
    if (checkInternal(prop)) continue;
    if (prop.getType().getCallSignatures().length > 0) continue;

    const type = getPropTypeText(prop);
    const entry: PropDoc = { name, type, typeHtml: highlightType(type) };
    if (prop.isReadonly()) entry.readonly = true;
    if (prop.hasQuestionToken()) entry.optional = true;
    if (checkDeprecated(prop)) entry.deprecated = true;
    const desc = getDesc(prop);
    if (desc) entry.description = desc;
    const def = getDefaultVal(prop);
    if (def) entry.default = def;
    props.push(entry);
  }

  if (props.length > 0) doc.properties = props;

  // ── Methods ───────────────────────────────────────────────────────────────
  const methods: MethodDoc[] = [];
  const lifecycle: MethodDoc[] = [];

  for (const method of cls.getMethods()) {
    const name = method.getName();
    if (name.startsWith('_')) continue;
    const scope = method.getScope();
    if (scope === Scope.Private) continue;
    if (checkInternal(method)) continue;

    const tags = getDocTags(method);
    if (scope === Scope.Protected) tags.push('protected');
    const params = method.getParameters().map(p => {
      const type = getParamTypeText(p);
      const param: ParamDoc = { name: p.getName(), type, typeHtml: highlightType(type) };
      if (p.hasQuestionToken()) param.optional = true;
      return param;
    });
    const returns = getMethodReturnText(method);
    const signature = buildSignature(params, returns);
    const entry: MethodDoc = {
      name,
      params,
      returns,
      returnsHtml: highlightType(returns),
      signature,
      signatureHtml: highlightType(signature),
      tags,
    };
    if (checkDeprecated(method)) entry.deprecated = true;
    const desc = getDesc(method);
    if (desc) entry.description = desc;

    if (tags.includes('lifecycle')) lifecycle.push(entry);
    else methods.push(entry);
  }

  // Arrow function properties (e.g. getDeltaTime, requestRender)
  for (const prop of cls.getProperties()) {
    const name = prop.getName();
    if (excluded.has(name)) continue;
    if (name.startsWith('_')) continue;
    const scope = prop.getScope();
    if (scope === Scope.Private) continue;
    if (checkInternal(prop)) continue;

    const callSigs = prop.getType().getCallSignatures();
    if (callSigs.length === 0) continue;

    const tags = getDocTags(prop);
    if (scope === Scope.Protected) tags.push('protected');
    const sig = callSigs[0];
    const params: ParamDoc[] = sig.getParameters().map(p => {
      const type = cleanType(p.getTypeAtLocation(prop).getText(prop));
      return { name: p.getName(), type, typeHtml: highlightType(type) };
    });
    const returns = cleanType(sig.getReturnType().getText(prop));
    const signature = buildSignature(params, returns);
    const entry: MethodDoc = {
      name,
      params,
      returns,
      returnsHtml: highlightType(returns),
      signature,
      signatureHtml: highlightType(signature),
      tags,
    };
    const desc = getDesc(prop);
    if (desc) entry.description = desc;
    if (checkDeprecated(prop)) entry.deprecated = true;
    methods.push(entry);
  }

  // ── Synthetic on/off/once from TypedEmitter ────────────────────────────────
  if (isBaseTypedEmitter) {
    // Pick the most specific event key / payload type available.
    // Concrete map (e.g., ThreeContextEventMap) → use its enum name or `keyof Map`.
    // Generic TEvents (abstract base) → use `keyof TEvents`.
    const keyType = eventKeyTypeName
      ?? (resolvedMapTypeName ? `keyof ${resolvedMapTypeName}` : `keyof ${mapTypeName ?? 'TEvents'}`);
    const mapRef = resolvedMapTypeName ?? mapTypeName ?? 'TEvents';
    // Payload uses `T[event]` indexed access — readable and correct.
    const argsType = `${mapRef}[K]`;

    const emitterDocs: MethodDoc[] = [
      {
        name: 'on',
        params: [
          { name: 'event', type: 'K', typeHtml: highlightType('K') },
          {
            name: 'fn',
            type: `(...args: ${argsType}) => void`,
            typeHtml: highlightType(`(...args: ${argsType}) => void`),
          },
          { name: 'context', type: 'any', typeHtml: highlightType('any'), optional: true },
        ],
        returns: 'this',
        returnsHtml: highlightType('this'),
        signature: `<K extends ${keyType}>(event: K, fn: (...args: ${argsType}) => void, context?: any) => this`,
        signatureHtml: highlightType(
          `<K extends ${keyType}>(event: K, fn: (...args: ${argsType}) => void, context?: any) => this`
        ),
        tags: [],
        description: eventEntries && eventEntries.length > 0
          ? 'Subscribe to an event. See the Events table for available keys and payloads.'
          : 'Subscribe to an event declared via the class generic parameter.',
      },
      {
        name: 'once',
        params: [
          { name: 'event', type: 'K', typeHtml: highlightType('K') },
          {
            name: 'fn',
            type: `(...args: ${argsType}) => void`,
            typeHtml: highlightType(`(...args: ${argsType}) => void`),
          },
          { name: 'context', type: 'any', typeHtml: highlightType('any'), optional: true },
        ],
        returns: 'this',
        returnsHtml: highlightType('this'),
        signature: `<K extends ${keyType}>(event: K, fn: (...args: ${argsType}) => void, context?: any) => this`,
        signatureHtml: highlightType(
          `<K extends ${keyType}>(event: K, fn: (...args: ${argsType}) => void, context?: any) => this`
        ),
        tags: [],
        description: 'Subscribe to an event, automatically unsubscribing after it fires once.',
      },
      {
        name: 'off',
        params: [
          { name: 'event', type: 'K', typeHtml: highlightType('K') },
          {
            name: 'fn',
            type: `(...args: ${argsType}) => void`,
            typeHtml: highlightType(`(...args: ${argsType}) => void`),
            optional: true,
          },
          { name: 'context', type: 'any', typeHtml: highlightType('any'), optional: true },
          { name: 'once', type: 'boolean', typeHtml: highlightType('boolean'), optional: true },
        ],
        returns: 'this',
        returnsHtml: highlightType('this'),
        signature: `<K extends ${keyType}>(event: K, fn?: (...args: ${argsType}) => void, context?: any, once?: boolean) => this`,
        signatureHtml: highlightType(
          `<K extends ${keyType}>(event: K, fn?: (...args: ${argsType}) => void, context?: any, once?: boolean) => this`
        ),
        tags: [],
        description: 'Remove a previously registered listener. Omit `fn` to remove all listeners for the event.',
      },
    ];

    doc.events = {
      emitterMethods: emitterDocs,
      ...(resolvedMapTypeName ? { mapTypeName: resolvedMapTypeName } : {}),
      ...(eventKeyTypeName ? { keyTypeName: eventKeyTypeName } : {}),
      ...(isGenericMap ? { isGeneric: true } : {}),
      ...(eventEntries ? { entries: eventEntries } : {}),
    };
  }

  if (methods.length > 0) doc.methods = methods;
  if (lifecycle.length > 0) doc.lifecycle = lifecycle;

  writeFileSync(join(OUT_DIR, `${target.cls}.json`), JSON.stringify(doc, null, 2));
  console.log(`✓ ${target.cls}`);
}

console.log(`\nDone → content/docs/api/generated/`);
