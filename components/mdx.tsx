import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import type { MDXComponents } from 'mdx/types';
import { CodeRunner } from '@/components/interactive/CodeRunner';
import { RpcPlayground } from '@/components/interactive/RpcPlayground';
import { RestPlayground } from '@/components/interactive/RestPlayground';
import { LiveStatus } from '@/components/interactive/Live';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Tab,
    Tabs,
    Step,
    Steps,
    Accordion,
    Accordions,
    CodeRunner,
    RpcPlayground,
    RestPlayground,
    LiveStatus,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
