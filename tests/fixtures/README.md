# Phase 3 evidence — operator console against a real testnet deployment

This directory records the run that produced Phase 3's on-chain evidence. **Every hash below is a
real Stellar testnet transaction**, re-readable from the RPC at the time of writing. Nothing here is
simulated, and nothing is asserted from the console's own success message.

- Network: Stellar testnet, passphrase `Test SDF Network ; September 2015`
- RPC: `https://soroban-testnet.stellar.org`
- Run: 2026-09-15, ledgers 4691622–4691647
- Produced by: `npm run prove:phase3` (`scripts/prove-phase3.ts`)
- Machine-readable record: [`phase3-proof.json`](./phase3-proof.json)

## How this was produced, and what that means

The script drives **the same `lib/guard/*` modules the console calls**: `guardOps.ts` for the
deploy → initialize → policy → freeze path, and `telemetry.ts` for the event feed. The only
substitution is the signer — a keypair-backed `WalletSigner` in place of the Freighter adapter:

```ts
const signer = keypairSigner(admin);   // address / signTransaction / signAuthEntry
```

That substitution is the entire reason `WalletSigner` exists as a seam. It is also the honest limit
of this evidence, stated plainly below.

## Deployment

| | |
| --- | --- |
| Guard (custom account) | `CC6VDBH5M473O4XUPD5GNRVIPB6CJ4U6IZCITF7XLKNLMWZPP3U5BMTK` |
| Token (SAC) | `CA2ZYESXGJBHLT2ZDS7XRJLLRD4LANPDTRROTXG46LQNWUVE5ETSQTCO` |
| Admin | `GCEJPO5S6IQQFWPZR2ZJ2SHQ57RM4OWHNRX25BQCOYBZRLTO3OV3SXBJ` |
| Agent | `GCIBTDRLXBIR6TGIW4UJWAIPWB6GGB6S5GXBSY4A5DEXYVV673HLATX4` |
| Agent raw Ed25519 pubkey | `90198e2bb8511f4cc8b7289b010fb07c6307d2e9ae196380e8c97c56befeceb0` |
| Issuer / recipient | `GAI6FYGDV7SO26YR3RPQ7NDDDO3QUZF35VJEKR2H3CBJKO4GIAULJMU2` / `GCKGXI7S74OOXTMMADMRTNGQSW4ZI3ILZZSHYF6656WLSLUFQ6MWSVV7` |
| Artifact (pinned, and verified on chain) | `f47919f92e78fdd034836aa61955fc338dd56a218c448c37df1867a8c3da0f63`, 39673 bytes |

The deployed instance runs that exact artifact: the console fetched the bytecode off the chain,
hashed it locally, compared it to the pin, deployed it, and then re-read the new instance to confirm
the code it runs. `deploy.verifiedAgainstPin = true` in the fixture, and the re-read identity reports
`bytes: 39673` for both the ledger's declared hash and the locally computed one.

## The write sequence, with real transactions

| Step | Transaction | Ledger |
| --- | --- | --- |
| Create the SAC test token | [`f460fcd1d6b639ad5817a727fc1c7d13bd5746974306b013f0bc699fac0a93b1`](https://stellar.expert/explorer/testnet/tx/f460fcd1d6b639ad5817a727fc1c7d13bd5746974306b013f0bc699fac0a93b1) | 4691622 |
| **Deploy from the pinned bytes** | [`bcd8eac52d6efb50eb2c8d7d9650493da9be7fe73b0be18a450282fa24006579`](https://stellar.expert/explorer/testnet/tx/bcd8eac52d6efb50eb2c8d7d9650493da9be7fe73b0be18a450282fa24006579) | 4691623 |
| `initialize(admin, agent_pubkey)` | [`bf597dc9888a4ac8199922a1ed6d7099eeb4267d51b2e312f6bbc225a02e7132`](https://stellar.expert/explorer/testnet/tx/bf597dc9888a4ac8199922a1ed6d7099eeb4267d51b2e312f6bbc225a02e7132) | 4691624 |
| `set_policy` via the console's form path | [`8d45d22f3791f7d22722412589b31388e231a01944d7ed361342123a6b087dd9`](https://stellar.expert/explorer/testnet/tx/8d45d22f3791f7d22722412589b31388e231a01944d7ed361342123a6b087dd9) | 4691625 |
| Recipient trustline | [`527de387e2feb758e5f949402f80dff9dfb5e0a731473fdf2f001c2689dca26d`](https://stellar.expert/explorer/testnet/tx/527de387e2feb758e5f949402f80dff9dfb5e0a731473fdf2f001c2689dca26d) | 4691626 |
| Mint 100000 to the guard | [`49d50a34ff340ca887428aaa806d4904c8f3b08d4131eaecda53f0e16781c1f3`](https://stellar.expert/explorer/testnet/tx/49d50a34ff340ca887428aaa806d4904c8f3b08d4131eaecda53f0e16781c1f3) | 4691627 |
| Agent transfer, unfrozen — **allowed** | [`fe1f5e48960bfe154100e2b671ac81415deeb5e9266794ab1be555076d88f675`](https://stellar.expert/explorer/testnet/tx/fe1f5e48960bfe154100e2b671ac81415deeb5e9266794ab1be555076d88f675) | 4691628 |
| **Panic button: `freeze()`** | [`0d57cd1cd8d2988a11a429e479abdba26bc415072a451b663fdfa5038823d3ff`](https://stellar.expert/explorer/testnet/tx/0d57cd1cd8d2988a11a429e479abdba26bc415072a451b663fdfa5038823d3ff) | 4691629 |
| **Reversal: `unfreeze()`** | [`33929a97c19b8095c46ad71e674b6f47570b17c49e0af237b9dfda7b14979228`](https://stellar.expert/explorer/testnet/tx/33929a97c19b8095c46ad71e674b6f47570b17c49e0af237b9dfda7b14979228) | 4691630 |
| Agent transfer again — **allowed** | [`503f649eb91cb2e755297fa326f91e7e90921924471324cbbde25514660f2c18`](https://stellar.expert/explorer/testnet/tx/503f649eb91cb2e755297fa326f91e7e90921924471324cbbde25514660f2c18) | 4691632 |

## The panic-button proof

This is the claim Phase 3 had to substantiate, and it is substantiated three independent ways rather
than by the console's own report.

**1. The identical transfer, before and after.** The same call — an agent-authorized SAC `transfer`
of 10 units to the allowlisted recipient, signed by the agent key through `__check_auth` — was
**allowed** at ledger 4691628, **refused** while frozen, and **allowed** again at ledger 4691632 after
`unfreeze`. Only the freeze differs between those three attempts, so the freeze is what explains the
difference.

**2. The contract's own view, re-read from the chain.** `status()` after the freeze:

```json
{ "admin_frozen": true, "has_policy": true, "heartbeat_expired": false,
  "last_heartbeat": "1789481712", "now": "1789481732" }
```

and after `unfreeze()`:

```json
{ "admin_frozen": false, "has_policy": true, "heartbeat_expired": false,
  "last_heartbeat": "1789481737", "now": "1789481737" }
```

The console does not trust the write's own response — the freeze flow re-reads this and reports
failure if the flag did not change.

**3. The guard's own refusal event.** The refused transfer produced, in the failed enforced
simulation's diagnostics:

```json
{
  "kind": "auth_checked",
  "topic": "event_auth_checked",
  "source": "diagnostic",
  "contractId": "CC6VDBH5M473O4XUPD5GNRVIPB6CJ4U6IZCITF7XLKNLMWZPP3U5BMTK",
  "decision": { "result": "blocked", "reason": "admin_frozen", "source": "diagnostic" },
  "data": {}
}
```

The contract named its own reason. The console did not infer it from a generic failure — which
matters, because "it failed" would also be true of a contract trap, a missing trustline or a fee
error.

Additionally, `check()` — the contract's pure read-only replica of the decision path — returned
`Blocked(admin_frozen)` while frozen.

**Why the refused transfer has no transaction hash:** it was never broadcast. The refusal happens in
the enforced simulation, before submission, which is the entire point of the pre-flight path.
Demanding a hash for a blocked action would be demanding fabricated evidence.

## Telemetry

The feed decoded 6 real events covering **every** lifecycle event the writes emitted —
`initialized`, `policy_set`, `auth_checked`, `frozen`, `unfrozen` — with
`telemetryMissingFromScan: []` in the fixture.

One caveat worth keeping on the record: the scan window is bounded (`getEvents` from a fixed ledger),
so this is not guaranteed on every run. On an earlier pass of this same script a single
`event_unfrozen` fell outside the window; the script **reported that** rather than quietly presenting
a partial set as complete, which is the behaviour that matters. A run that reports nothing missing
has verified nothing is missing, and a run that reports a gap is telling the truth about the gap.

## What this evidence is NOT

Stated plainly, because overclaiming here would defeat the purpose of the exercise:

1. **The browser UI was not driven end to end.** This environment has no browser available. The
   React components are verified only by typechecking, linting and building/serving the app. The
   on-chain behaviour is verified by driving the identical `lib/guard/*` code paths headlessly. If a
   component were mis-wired to the library, this evidence would not catch it.
2. **Freighter was not exercised.** The `WalletSigner` used here is keypair-backed. The Freighter
   adapter (`lib/guard/wallet.ts`) compiles and is structurally identical, but its two wallet prompts
   (authorization entry, then envelope) have not been observed in a real extension.
3. **The SDK is not a published artifact.** It was built from the `phase2-completion` branch at
   commit `9103ae9` and vendored as a tarball, because Phase 2's publish step has not happened. See
   the status note in the top-level README.
4. **Recipient/amount enforcement is not demonstrated for non-SAC calls**, because v1 cannot enforce
   it. No claim to the contrary appears anywhere in this repo; the boundary is stated verbatim in the
   README, `SPEC.md` and the UI.
5. **Nothing here is a security audit.** The contract is a security tool that has not been audited.

## Reproducing

```bash
npm install
npm run prove:phase3
```

The run is idempotent: keys, the token and the deployed guard are reused from `.env.phase3`
(gitignored) on subsequent runs, so a second run re-verifies the *state* rather than re-proving the
deploy. Delete `.env.phase3` for a fresh deployment end to end, which is how the record above was
produced.
