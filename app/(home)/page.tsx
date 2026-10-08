import Link from 'next/link';
import { ArrowRight, BookOpen, Boxes, Code2, KeyRound, LineChart, Search, Shield, Wallet } from 'lucide-react';
import { LiveStatus } from '@/components/interactive/Live';
import { LogoMark } from '@/components/brand/Logo';
import { apps } from '@/lib/shared';

const SECTIONS = [
  { href: '/docs/get-started/quickstart', icon: BookOpen, title: 'Quickstart', text: 'Set up QRDX Wallet, connect to testnet and make your first trade.' },
  { href: '/docs/guides/wallet', icon: Wallet, title: 'Use QRDX', text: 'The wallet, spot trading, liquidity, perps, launching a token and the explorer.' },
  { href: '/docs/concepts/post-quantum', icon: KeyRound, title: 'Concepts', text: 'Post-quantum accounts, native tokens, the exchange engine, perps and consensus.' },
  { href: '/docs/build', icon: Code2, title: 'Build on QRDX', text: 'JSON-RPC, REST, streams, signing exchange transactions, wallet integration.' },
  { href: '/docs/reference/json-rpc', icon: Boxes, title: 'Reference', text: 'Every method, operation and error, with requests you can run in place.' },
  { href: '/docs/security/post-quantum-cryptography', icon: Shield, title: 'Security', text: 'Why post-quantum, what ML-DSA-65 protects, and keeping a wallet safe.' },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-16 text-center sm:pt-24">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-fd-border bg-fd-card shadow-sm">
          <LogoMark className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">QRDX documentation</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-fd-muted-foreground">
          A blockchain secured by post-quantum signatures, with an exchange built into the protocol. Learn to use it, and build on it with
          examples that run live against testnet, right in the page.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/docs/get-started/quickstart" className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground hover:opacity-90">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/docs/build" className="inline-flex items-center gap-2 rounded-lg border border-fd-border bg-fd-card px-5 py-2.5 text-sm font-medium hover:bg-fd-accent">
            <Code2 className="h-4 w-4" /> Build on QRDX
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4">
        <LiveStatus />
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="group rounded-xl border border-fd-border bg-fd-card p-5 transition-colors hover:border-fd-primary/50 hover:bg-fd-accent/50">
            <s.icon className="h-5 w-5 text-fd-primary" />
            <h2 className="mt-3 font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-fd-muted-foreground">{s.text}</p>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-4 rounded-xl border border-fd-border bg-fd-card p-5 sm:grid-cols-3">
          {[
            { href: apps.trade, icon: LineChart, title: 'QRDX Trade', text: 'Spot books, pools, perpetuals and the API.' },
            { href: apps.explorer, icon: Search, title: 'QRDX Explorer', text: 'Blocks, transactions, tokens and markets.' },
            { href: apps.wallet, icon: Wallet, title: 'QRDX Wallet', text: 'Web, iPhone and browser extension.' },
          ].map((a) => (
            <a key={a.href} href={a.href} target="_blank" rel="noopener noreferrer" className="flex gap-3 rounded-lg p-2 hover:bg-fd-accent/60">
              <a.icon className="mt-0.5 h-5 w-5 shrink-0 text-fd-muted-foreground" />
              <span>
                <span className="block text-sm font-medium">{a.title}</span>
                <span className="block text-xs text-fd-muted-foreground">{a.text}</span>
              </span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
