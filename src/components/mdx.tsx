import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { ThreeDemo } from './ThreeDemo';
import { Mermaid } from './Mermaid';
import {
  ApiEmitterMethods,
  ApiEvents,
  ApiInit,
  ApiLifecycle,
  ApiMethods,
  ApiProperties,
} from './ApiTable';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ThreeDemo,
    Mermaid,
    ApiInit,
    ApiProperties,
    ApiMethods,
    ApiEmitterMethods,
    ApiLifecycle,
    ApiEvents,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
