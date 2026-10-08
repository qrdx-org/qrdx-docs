import { cn } from '@/lib/cn'

/** The QRDX mark (as on trade.qrdx.org and explorer.qrdx.org), in currentColor. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-6 w-6', className)} aria-hidden>
      <defs>
        <mask id="qrdx-mark-cut">
          <rect width="64" height="64" fill="white" />
          <polygon points="22,25 40,25 66,57 48,57" fill="black" />
        </mask>
      </defs>
      <rect x="7.5" y="9.5" width="41" height="38" rx="8" fill="none" stroke="currentColor" strokeWidth="7.5" mask="url(#qrdx-mark-cut)" />
      <polygon points="26,27 36,27 59,55 49,55" fill="currentColor" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark className="h-[22px] w-[22px] text-fd-foreground" />
      <span className="text-[15px] font-semibold tracking-tight">
        QRDX<span className="ml-1 font-normal text-fd-muted-foreground">Docs</span>
      </span>
    </span>
  )
}
