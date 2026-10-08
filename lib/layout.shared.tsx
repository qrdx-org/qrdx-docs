import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Wordmark } from '@/components/brand/Logo';
import { apps, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Wordmark />,
      url: '/',
    },
    githubUrl: `https://github.com/${gitConfig.user}`,
    links: [
      { text: 'Trade', url: apps.trade, external: true },
      { text: 'Explorer', url: apps.explorer, external: true },
      { text: 'Wallet', url: apps.wallet, external: true },
    ],
  };
}
