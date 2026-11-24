# QRDX Docs

The documentation at [docs.qrdx.org](https://docs.qrdx.org): guides for QRDX Wallet, trading and the explorer, the concepts behind the chain, and developer references whose examples run live against testnet in the page.

Built with [Fumadocs](https://fumadocs.dev) on Next.js 16 (MDX, static export, Orama search), in the same monochrome as qrdx.org, trade.qrdx.org, explorer.qrdx.org and the wallet. The home page's backdrop (`BlockPond`) is a halftone pond that ripples with each testnet block from the stream and with the reader's pointer.

```bash
pnpm install
pnpm dev            # http://localhost:3500
pnpm build          # static site in out/
pnpm types:check
```

`pnpm build` writes a fully static site to `out/`: deploy it to any static host (Cloudflare Pages: build command `pnpm build`, output directory `out`). There is no server; the interactive examples call the QRDX node and the trade API from the reader's browser, both of which allow cross-origin requests.

## Writing

Pages are MDX in `content/docs/`. Each folder's `meta.json` orders its pages; `content/docs/meta.json` orders the sections. Front matter: `title`, `description`, and an optional `icon` (a [Lucide](https://lucide.dev/icons) name in its canonical form, e.g. `ChartLine`).

Available in every page, besides Markdown: `Callout`, `Cards`/`Card`, `Steps`/`Step`, `Tabs`/`Tab`, `Accordions`/`Accordion`, and the interactive components below.

### Interactive components

| Component | Does |
| --- | --- |
| `<RpcPlayground method="eth_chainId" params={[]} />` | a JSON-RPC call with editable params; `editable` also makes the method editable |
| `<RestPlayground path="/get_ticker" query={{ market: "…" }} />` | a REST `GET` with editable query parameters; `api="trade"` or `api="profiles"` for those services |
| `<CodeRunner example="pq-keys" />` | editable JavaScript that runs live (examples in `components/interactive/examples.ts`) |
| `<LiveStatus />` | the chosen network's height, finalized epoch, block interval and chain id, streamed |
| `<KeyLab />` | a real ML-DSA-65 key pair made in the browser; its public key and a signature drawn one dot per byte beside secp256k1's, to scale; flip a byte or change the message and verification refuses it |
| `<EpochClock />` | the chosen network's slot clock (`/chain_spec` and the genesis block), the current epoch filling in with the blocks that arrive, and finality's lag |
| `<ContractPlayground template="counter" />` | Solidity compiled in the browser (solc 0.8.30 from binaries.soliditylang.org, in a Web Worker, EVM Shanghai), deployed through QRDX Wallet signed post-quantum (`qrdx_sendPQTransaction`, no `to`) or with the classic key (`eth_sendTransaction`), then called: reads over JSON-RPC, writes through the wallet, events decoded with viem. Templates in `components/interactive/contracts.ts`; deployments remembered per network in the browser |

Every component has a network menu (testnet, a local node, or any node URL), shared across the page and remembered per browser.

**The code runner** executes the reader's code in a sandboxed iframe (`sandbox="allow-scripts"`: an opaque origin, no access to the page, its storage or cookies), created fresh for each run and removed when it finishes or after 60 seconds. The iframe calls back to the page for `rpc`, `rest`, `trade`, the post-quantum helpers (`pq.keygen`, `pq.sign`, `pq.verify`, `pq.address`, `pq.accountId`, computed with `@noble/post-quantum` exactly as QRDX Wallet and the node do) and hashes; `fetch` and `WebSocket` work directly. To add an example, add an entry to `EXAMPLES` and reference it by id.

### Accuracy

These docs describe what runs. Facts come from the node (`qrdx-chain` docs and source), qrdx-trade's `docs/`, and qrdx-wallet's `docs/`; the JSON-RPC and REST references were generated from the node's source and checked against testnet. Features that exist only in the whitepaper belong on the roadmap page, marked as planned.

## Layout

```text
app/                      routes: landing, /docs/[[...slug]], search index, llms.txt, OG images
components/interactive/   playgrounds, code runner, live status, network context, PQ helpers
components/brand/         the QRDX mark
content/docs/             the pages
lib/                      source loader, layout options, site constants
```
