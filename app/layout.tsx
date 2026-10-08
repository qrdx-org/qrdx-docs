import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Provider } from '@/components/provider';
import { siteUrl } from '@/lib/shared';
import './global.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { template: '%s · QRDX Docs', default: 'QRDX Docs' },
  description:
    'Documentation for QRDX: a post-quantum blockchain with a native exchange. Guides for the wallet, trading and the explorer, and live, runnable references for the node, the trade API and wallet integration.',
  icons: { icon: '/logo.png' },
  openGraph: { siteName: 'QRDX Docs', type: 'website' },
  twitter: { card: 'summary_large_image', creator: '@qrdx_org' },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.className} ${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
