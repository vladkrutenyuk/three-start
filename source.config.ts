import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { visit } from 'unist-util-visit';

function remarkMermaid() {
  return (tree: unknown) => {
    visit(tree as never, 'code', (node: any, index, parent: any) => {
      if (node.lang !== 'mermaid' || !parent || index === undefined) return;
      parent.children[index] = {
        type: 'mdxJsxFlowElement',
        name: 'Mermaid',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'chart', value: node.value },
        ],
        children: [],
      };
    });
  };
}

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: (v) => [remarkMermaid, ...v],
  },
});
