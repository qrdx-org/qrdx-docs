'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Copy, Loader2, Play, Square } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Frame({ title, badge, right, children, className }: { title: ReactNode; badge?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('not-prose my-6 overflow-hidden rounded-xl border border-fd-border bg-fd-card text-sm shadow-sm', className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-fd-border bg-fd-muted/40 px-3 py-2">
        {badge}
        <div className="min-w-0 flex-1 truncate font-mono text-[12.5px] font-medium">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'primary' | 'bid' | 'ask' | 'warn' }) {
  const tones = {
    muted: 'border-fd-border text-fd-muted-foreground',
    primary: 'border-fd-primary/40 bg-fd-primary/10 text-fd-primary',
    bid: 'border-bid/40 bg-bid/10 text-bid',
    ask: 'border-ask/40 bg-ask/10 text-ask',
    warn: 'border-warn/40 bg-warn/10 text-warn',
  };
  return <span className={cn('inline-flex shrink-0 items-center rounded-md border px-1.5 py-px font-mono text-[10.5px] font-semibold uppercase tracking-wide', tones[tone])}>{children}</span>;
}

export function RunButton({ running, onRun, onStop, label = 'Run' }: { running: boolean; onRun: () => void; onStop?: () => void; label?: string }) {
  return running && onStop ? (
    <button onClick={onStop} className="inline-flex items-center gap-1.5 rounded-md border border-fd-border bg-fd-background px-2.5 py-1 text-xs font-medium hover:bg-fd-accent">
      <Square className="h-3 w-3 fill-current" /> Stop
    </button>
  ) : (
    <button
      onClick={onRun}
      disabled={running}
      className="inline-flex items-center gap-1.5 rounded-md bg-fd-primary px-2.5 py-1 text-xs font-medium text-fd-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
      {label}
    </button>
  );
}

export function CopyButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground', className)}
      aria-label={label ?? 'Copy'}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

/** JSON with colours for keys, strings, numbers and literals; long output starts collapsed. */
export function JsonView({ value, maxHeight = 360 }: { value: unknown; maxHeight?: number }) {
  const text = useMemo(() => (typeof value === 'string' ? value : JSON.stringify(value, null, 2)), [value]);
  const lines = text.split('\n').length;
  const [open, setOpen] = useState(lines <= 40);
  const html = useMemo(() => highlight(text), [text]);
  return (
    <div className="relative">
      <CopyButton text={text} className="absolute right-2 top-2 z-10 bg-fd-card/80 backdrop-blur" />
      <pre
        className="overflow-auto px-3 py-2.5 font-mono text-[12px] leading-relaxed"
        style={{ maxHeight: open ? maxHeight * 3 : maxHeight }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {lines > 40 && (
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-center gap-1 border-t border-fd-border py-1 text-[11px] text-fd-muted-foreground hover:bg-fd-accent">
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
          {open ? 'Show less' : `Show all ${lines.toLocaleString()} lines`}
        </button>
      )}
    </div>
  );
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function highlight(json: string): string {
  return escapeHtml(json).replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      let cls = 'text-fd-foreground';
      if (m.startsWith('"')) cls = m.endsWith(':') ? 'text-fd-primary' : 'text-bid';
      else if (/true|false/.test(m)) cls = 'text-warn';
      else if (m === 'null') cls = 'text-fd-muted-foreground';
      else cls = 'text-warn';
      return `<span class="${cls}">${m}</span>`;
    }
  );
}

export function Status({ ok, status, ms, note }: { ok: boolean; status?: number; ms?: number; note?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] text-fd-muted-foreground">
      <span className={cn('font-mono font-semibold', ok ? 'text-bid' : 'text-ask')}>{status ? status : ok ? 'OK' : 'ERROR'}</span>
      {ms !== undefined && <span className="num">{ms} ms</span>}
      {note && <span>{note}</span>}
    </span>
  );
}
