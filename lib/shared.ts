import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'QRDX Docs';
export const siteUrl = 'https://docs.qrdx.org';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

export const gitConfig = {
  user: 'qrdx-org',
  repo: 'qrdx-docs',
  branch: 'main',
};

/** The live apps, linked from the nav and the pages. */
export const apps = {
  website: 'https://qrdx.org',
  trade: 'https://trade.qrdx.org',
  explorer: 'https://explorer.qrdx.org',
  wallet: 'https://wallet.qrdx.org',
};

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md'];

  return { segments, url: getContentUrl(segments, page.locale) };
}

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];

  return { segments, url: getImageUrl(segments, page.locale) };
}
