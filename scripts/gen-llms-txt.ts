/**
 * Generates llms.txt (page-tree index) and llms-full.txt (full markdown) at the
 * project root, so `npm publish` ships them at the package root via package.json#files.
 *
 * Run: tsx scripts/gen-llms-txt.ts
 *
 * Uses Vite's programmatic API to load the same `source` loader the dev/SSR routes
 * use — that way `import.meta.glob` inside `.source/*.ts` works exactly as it does
 * at runtime, with no separate file-walking logic.
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import mdx from 'fumadocs-mdx/vite';
import type { llms as LlmsFn } from 'fumadocs-core/source';
import type { source as SourceObj, getLLMText as GetLLMText } from '../src/lib/source';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const sourceConfig = await import('../source.config');

  const server = await createServer({
    configFile: false,
    root: ROOT,
    plugins: [mdx(sourceConfig)],
    resolve: { tsconfigPaths: true },
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'warn',
  });

  try {
    const sourceMod = (await server.ssrLoadModule('/src/lib/source.ts')) as {
      source: typeof SourceObj;
      getLLMText: typeof GetLLMText;
    };
    const fumaSource = (await server.ssrLoadModule('fumadocs-core/source')) as {
      llms: typeof LlmsFn;
    };

    const indexTxt = fumaSource.llms(sourceMod.source).index();
    const indexPath = resolve(ROOT, 'llms.txt');
    writeFileSync(indexPath, indexTxt);
    console.log(`[llms] wrote ${indexPath} (${indexTxt.length} bytes)`);

    const pages = sourceMod.source.getPages();
    const scanned = await Promise.all(pages.map(sourceMod.getLLMText));
    const fullTxt = scanned.join('\n\n');
    const fullPath = resolve(ROOT, 'llms-full.txt');
    writeFileSync(fullPath, fullTxt);
    console.log(
      `[llms] wrote ${fullPath} (${pages.length} pages, ${fullTxt.length} bytes)`,
    );
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
