import { createFileRoute } from '@tanstack/react-router';
// The single curated llms.txt that ships in the npm package.
// Imported via `?raw` so its content is bundled into the SSR build —
// no fs reads at request time, and there's only one source of truth.
import llmsTxt from '../../llms.txt?raw';

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET() {
        return new Response(llmsTxt, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});
