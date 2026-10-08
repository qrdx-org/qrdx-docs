/**
 * The runnable examples the docs embed (<CodeRunner example="…" />). Each runs in the
 * code runner's sandbox, with rpc, rest, trade, pq, hash, network and sleep in scope.
 */

export const EXAMPLES = {
  'chain-status': {
    title: 'Read the chain head',
    code: `
// REST and JSON-RPC answer from the same node.
const status = await rest('/get_status')
const chainId = parseInt(await rpc('eth_chainId'), 16)
const block = await rpc('eth_getBlockByNumber', 'latest', false)

console.log('height        ', status.height)
console.log('chain id      ', chainId)
console.log('latest block  ', parseInt(block.number, 16), new Date(parseInt(block.timestamp, 16) * 1000).toISOString())
console.log('node id       ', status.node_id)
`,
  },

  'pq-keys': {
    title: 'Create a post-quantum key and its address',
    code: `
// An ML-DSA-65 key pair from a 32-byte seed, made in your browser. QRDX Wallet
// derives its seed from the recovery phrase; here it is random.
const key = await pq.keygen()

console.log('public key ', key.publicKey.length / 2, 'bytes')
console.log('secret key ', key.secretKey.length / 2, 'bytes')
console.log('address    ', key.address)      // 0xPQ + checksummed keccak256(publicKey)[0..32]
console.log('account id ', key.accountId)    // the 20-byte ledger key the EVM sees

// The node derives the same account id from the address alone.
const node = await rpc('qrdx_getAccountId', key.address)
console.log('node agrees', node.accountId === key.accountId)
`,
  },

  'pq-sign': {
    title: 'Sign and verify a message',
    code: `
const key = await pq.keygen()
const message = 'I own this address. ' + new Date().toISOString()

// What qrdx_signPQMessage does: ML-DSA-65 over
// "\\x19QRDX PQ Signed Message:\\n" + byteLength + message
const signature = await pq.sign(message, key.secretKey)
console.log('signature', signature.length / 2, 'bytes')

console.log('valid              ', await pq.verify(message, signature, key.publicKey))
console.log('message changed    ', await pq.verify(message + '!', signature, key.publicKey))
const other = await pq.keygen()
console.log('someone else\\'s key', await pq.verify(message, signature, other.publicKey))
`,
  },

  markets: {
    title: 'List every market',
    code: `
const markets = await rpc('market_getMarkets')

console.table(markets.map((m) => ({
  market: m.type === 'perp' ? m.market : \`\${m.base_info?.symbol ?? m.base.slice(0, 8)}/\${m.quote_info?.symbol ?? m.quote.slice(0, 8)}\`,
  type: m.type,
  last: m.last_price ? Number(m.last_price).toPrecision(6) : '—',
  '24h %': m.change_pct_24h ?? '—',
  trades: m.trades_24h,
})))
`,
  },

  'order-book': {
    title: 'Read an order book',
    code: `
// Any market: a spot pair "base:quote" (addresses, a unique symbol, or QRDX) or a perps id.
const spot = (await rpc('market_getMarkets', 'spot')).find((m) => m.best_bid && m.best_ask)
if (!spot) return 'no spot book with both sides right now'

const book = await rpc('market_getOrderBook', spot.market, 5, 2)
const name = \`\${spot.base_info.symbol}/\${spot.quote_info.symbol}\`
console.log(name, 'at block', book.block_height)
console.log('best bid', book.best_bid, '· best ask', book.best_ask, '· spread', book.spread_bps, 'bps')
console.table([
  ...book.asks.slice().reverse().map((l) => ({ side: 'ask', price: l.price, amount: l.amount, total: l.total, orders: l.orders })),
  ...book.bids.map((l) => ({ side: 'bid', price: l.price, amount: l.amount, total: l.total, orders: l.orders })),
])
`,
  },

  candles: {
    title: 'Candles and a moving average',
    code: `
const market = (await rpc('market_getMarkets', 'spot'))
  .sort((a, b) => b.trades_24h - a.trades_24h)[0]
const { candles } = await rpc('market_getCandles', market.market, '1h', 48)

const closes = candles.map((c) => Number(c.close))
const sma = (n) => closes.slice(-n).reduce((s, x) => s + x, 0) / Math.min(n, closes.length)

console.log(\`\${market.base_info.symbol}/\${market.quote_info.symbol}: \${candles.length} hourly candles with trades\`)
console.log('last close', closes.at(-1))
console.log('SMA(6)    ', sma(6))
console.log('SMA(24)   ', sma(24))
console.table(candles.slice(-6).map((c) => ({ time: new Date(c.time * 1000).toISOString().slice(5, 16), open: c.open, close: c.close, trades: c.trades })))
`,
  },

  'swap-quote': {
    title: 'Quote a swap',
    code: `
// Pools trade native tokens and native QRDX (named "QRDX"); a swap takes whichever
// venue pays more for the input: a pool or the order book.
const pools = await rpc('exchange_getPools')
const pool = pools.find((p) => p.positions > 0 && !p.paused)
if (!pool) return 'no pool with liquidity right now'

const q = await rpc('exchange_quoteSwap', pool.token0, pool.token1, '1', '', null, 'auto')
console.log('in       ', q.amount_in, pool.token0)
console.log('out      ', q.amount_out, pool.token1)
console.log('venue    ', q.source, q.pool_id ?? '')
console.log('fee      ', q.fee)
console.log('impact   ', q.price_impact ?? '—')

// Send min_amount_out = quote × (1 − your slippage tolerance) with the SWAP.
console.log('min out at 0.5 %', (Number(q.amount_out) * 0.995).toPrecision(8))
`,
  },

  'sign-exchange-tx': {
    title: 'Build and sign an exchange transaction',
    code: `
// Every exchange operation is a JSON transaction signed with an ML-DSA-65 key.
// The node renders the exact bytes to sign, so nobody has to reproduce them.
const key = await pq.keygen()
const nonce = await rpc('exchange_getNonce', key.address)

const unsigned = {
  op_type: 'PLACE_ORDER',
  sender: key.address,
  nonce,
  params: { pair: 'QRDX:0xe13ef577f2d8c6cb55e49c70e6ed48f64d0fc106', side: 'buy', order_type: 'limit', price: '0.5', amount: '10' },
}
const payload = await rpc('exchange_getSigningPayload', unsigned)

// The hash is BLAKE2b-256 of the signing bytes; check it ourselves.
console.log('tx hash ', payload.tx_hash)
console.log('matches ', (await hash.blake2b256('0x' + payload.signing_bytes)) === payload.tx_hash)

const signature = await pq.sign(payload.signing_bytes, key.secretKey, { raw: true })
const tx = { ...payload.tx, public_key: key.publicKey, signature }
console.log('verifies', await pq.verify(payload.signing_bytes, signature, key.publicKey, { raw: true }))

// This key holds no QRDX, so we stop here. A funded account would send it with
// rpc('exchange_sendTransaction', tx) and poll exchange_getTransactionReceipt.
return { ...tx, public_key: tx.public_key.slice(0, 32) + '…', signature: tx.signature.slice(0, 32) + '…' }
`,
  },

  stream: {
    title: 'Stream blocks and trades',
    code: `
// The node's WebSocket: blocks by default, plus any channels you subscribe to.
const ws = new WebSocket(network.ws)
let seen = 0

ws.onopen = () => ws.send(JSON.stringify({ op: 'subscribe', channels: ['blocks', 'trades'] }))
ws.onmessage = (m) => {
  const e = JSON.parse(m.data)
  if (e.type === 'block') console.log('block', e.height, '· finalized epoch', e.finalized_epoch)
  else if (e.type === 'trade') console.log('trade', e.trade.market.slice(0, 18) + '…', e.trade.side, e.trade.amount, '@', e.trade.price)
  else console.log(e.type, (e.channels ?? []).join(', '))
  seen++
}

await sleep(20_000)   // listen for 20 s
ws.close()
console.info(\`\${seen} messages\`)
`,
  },

  history: {
    title: "An account's transactions",
    code: `
// Indexed under every account a transaction touched; 0x and 0xPQ forms share one history.
const address = '0xPQF024d7895096D4Cd86fD4bC68e526FbdE8373e83C78F2CaEeE9279249201aCbc'
const page = await rpc('tx_getHistory', address, 10, null, 'exchange')

console.table(page.transactions.map((t) => ({
  block: t.block_height,
  op: t.op,
  status: t.status,
  amount: t.amount ?? '',
  fee: t.fee,
  roles: (t.roles ?? []).join(','),
})))
console.log('next page cursor:', page.next_cursor)
`,
  },

  perps: {
    title: 'Perpetual markets',
    code: `
const markets = await rpc('perp_getMarkets')
console.table(markets.map((m) => ({
  market: m.market_id,
  oracle: Number(m.oracle_price).toPrecision(6),
  mark: Number(m.mark_price).toPrecision(6),
  'funding/h %': (Number(m.funding_rate) * 100).toFixed(4),
  'open int.': m.open_interest,
  'max lev.': m.max_leverage,
})))
`,
  },

  'trade-api': {
    title: 'USD prices from the trade API',
    code: `
// trade.qrdx.org's API: the node's markets oriented by pair, plus USD reference prices.
const { prices } = await trade('/prices')
console.table(Object.entries(prices).filter(([, p]) => p).map(([asset, p]) => ({
  asset,
  usd: Number(p.price).toPrecision(8),
  source: p.source,
  '24h %': p.change24h ?? '—',
})))
`,
  },

  tokens: {
    title: 'Native tokens',
    code: `
// Every fungible token is native: a registry entry plus balances in consensus.
const tokens = await rpc('exchange_getTokens')
console.table(tokens.map((t) => ({
  symbol: t.symbol,
  name: t.name,
  supply: Number(t.total_supply).toExponential(3),
  mintable: t.mint_authority ? 'yes' : 'fixed',
  address: t.token_address,
})))
console.log('Symbols are not unique: identify a token by its address.')
`,
  },
} as const;

export type ExampleId = keyof typeof EXAMPLES;
