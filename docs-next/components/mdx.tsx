import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as Twoslash from 'fumadocs-twoslash/ui';
import type { MDXComponents } from 'mdx/types';

// Twoslash's hover popups need its UI components registered alongside the
// Fumadocs defaults — without them a ```ts twoslash block renders unstyled.
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...Twoslash,
    ...components,
  };
}

export const useMDXComponents = getMDXComponents;
