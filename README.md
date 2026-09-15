# stellar-agent-guard-dashboard

**Operator console for [Stellar Agent Guard](https://github.com/aigbagbobila/stellar-agent-guard-contracts):**
configure guardrails with a no-code form against a real on-chain deployment, watch the guard's real
events, and freeze the account with a panic button whose effect is confirmed by re-reading the
contract.

Pure consumer of [stellar-agent-guard-sdk](https://github.com/aigbagbobila/stellar-agent-guard-sdk)
and Soroban RPC. It holds no secrets and has no server half: every write is signed by the operator's
own Freighter wallet and broadcast straight to Soroban RPC.

> ## Status: Phase 3 — built, with the Phase 2 gate recorded as provisional
>
> This repo's own phase commitment says Phase 3 does not begin until Phase 2's exit criteria are
> met. **They are not met**, and that is recorded here rather than glossed over:
>
> | Phase 2 exit criterion | State |
> | --- | --- |
> | SDK published to npm | **not met** — `npm view stellar-agent-guard-sdk` returns `E404` |
> | CI green on `main` | **not met** — the `ci` workflow exists only on the unmerged `phase2-completion` branch |
> | Real integration tests against testnet | met — `tests/fixtures/integration-evidence.md` in the SDK repo, 5/5 live |
> | Phase 2 merged | **not met** — PR #2 is open; the SDK's `main` README still says "Phase 0 scaffold only" |
>
> **What this means in practice:** the SDK is consumed as a locally built tarball of the
> `phase2-completion` branch (`vendor/stellar-agent-guard-sdk-0.1.0.tgz`, built from commit
> `9103ae9`), not from a published version. Everything this console claims about *Phase 1* — the
> artifact it deploys, the policy it installs, the freeze it confirms — is proven against the real,
> public Phase 1 deployment. The claim that is **provisional** is the end-to-end one, because it
> currently runs through an unpublished SDK. When Phase 2 publishes, the tarball dependency is
> replaced with the published version and this note comes down.
>
> Phase 1 is genuinely complete: CI green on `main`, five on-chain scenarios with real contract IDs
> and transaction hashes.

## What it does

- **No-code guardrail configurator.** A form, not a CLI. Per-transaction cap, rolling-window cap and
  length, asset list, recipient allowlist, protocol allowlist, active window, pause, and dead-man
  grace. Validated locally before any wallet prompt, then encoded by the SDK's `policyToScVal` and
  written with a wallet-signed `set_policy`.
- **Real deployment from the UI.** Fetches the pinned Phase 1 bytecode *off the chain*, hashes it,
  and refuses to deploy unless it matches. Predicts the contract address before anything is signed,
  then reads the new instance back and checks the code it actually runs.
- **Telemetry.** Tails the guard's real events from Soroban RPC with a cursor, decoding them with
  the SDK's verified topic vocabulary.
- **Emergency panic button.** An explicit confirmation flow, a wallet-signed `freeze()`, and then a
  re-read of `status()` from the chain to confirm the account really is frozen — plus the reversal,
  and a clear distinction between an admin freeze and a dead-man-switch freeze.

## Enforcement scope — read this before relying on the caps

**Full recipient/amount enforcement — spend caps, allowlists, per-transaction limits — is native and
automatic for SAC token transfers (`transfer`/`transfer_from`), since these are the calls whose
arguments the Soroban auth context exposes for inspection. For other Soroban contract calls made by
the guarded account (arbitrary DEX/lending/protocol calls), the policy engine still enforces window
and pause state, but per-call amount/recipient limits are not yet enforced — extending fine-grained
enforcement to arbitrary calls is tracked as a v2 item, not implied as already covered.**

The same statement, word for word, is in [`SPEC.md`](./SPEC.md) and rendered in the console wherever
enforcement is described, from one shared constant (`lib/guard/network.ts`). A unit test
(`tests/unit/scopeStatement.test.ts`) fails if the three ever drift apart. This boundary is a
property of the platform — the auth context does not expose arbitrary call arguments generically —
not a gap this interface hides or overclaims.

## What is actually proven

`scripts/prove-phase3.ts` drives **the same `lib/guard/*` modules the UI calls** — `guardOps.ts` for
deploy/initialize/policy/freeze, `telemetry.ts` for the feed — with the only substitution being the
wallet (a keypair-backed `WalletSigner` instead of Freighter). That substitution is the entire reason
`WalletSigner` exists as a seam, and it is why this run is evidence about the console's logic rather
than about a re-implementation of it.

One real run produced, on Stellar testnet:

| Step | Result |
| --- | --- |
| Pinned artifact, re-derived from chain | `f47919f92e78fdd034836aa61955fc338dd56a218c448c37df1867a8c3da0f63`, 39673 bytes — matches |
| Deploy from the pinned bytes | [`bcd8eac5…`](https://stellar.expert/explorer/testnet/tx/bcd8eac52d6efb50eb2c8d7d9650493da9be7fe73b0be18a450282fa24006579) → `CC6VDBH5M473O4XUPD5GNRVIPB6CJ4U6IZCITF7XLKNLMWZPP3U5BMTK`, identity verified |
| `initialize(admin, agent_pubkey)` | [`bf597dc9…`](https://stellar.expert/explorer/testnet/tx/bf597dc9888a4ac8199922a1ed6d7099eeb4267d51b2e312f6bbc225a02e7132) |
| `set_policy` through the console's own form path | [`8d45d22f…`](https://stellar.expert/explorer/testnet/tx/8d45d22f3791f7d22722412589b31388e231a01944d7ed361342123a6b087dd9) |
| Agent transfer, unfrozen | **allowed**, [`fe1f5e48…`](https://stellar.expert/explorer/testnet/tx/fe1f5e48960bfe154100e2b671ac81415deeb5e9266794ab1be555076d88f675) |
| **Panic button: `freeze()`** | [`0d57cd1c…`](https://stellar.expert/explorer/testnet/tx/0d57cd1cd8d2988a11a429e479abdba26bc415072a451b663fdfa5038823d3ff) |
| `status()` re-read after freeze | `admin_frozen=true` |
| `check()` while frozen | `Blocked(admin_frozen)` |
| **The same agent transfer, frozen** | **blocked with reason `admin_frozen`** — no transaction, by construction |
| **Reversal: `unfreeze()`** | [`33929a97…`](https://stellar.expert/explorer/testnet/tx/33929a97c19b8095c46ad71e674b6f47570b17c49e0af237b9dfda7b14979228) |
| `status()` re-read after unfreeze | `admin_frozen=false` |
| The same transfer again | **allowed**, [`503f649e…`](https://stellar.expert/explorer/testnet/tx/503f649eb91cb2e755297fa326f91e7e90921924471324cbbde25514660f2c18) |

The freeze is confirmed by the contract, not by the console: `status()` reports the flag, and the
guard's own `event_auth_checked, blocked, admin_frozen` diagnostic is what the refused transfer
produces. Full record in [`tests/fixtures/phase3-proof.json`](./tests/fixtures/phase3-proof.json);
what was and was not verified in [`tests/fixtures/README.md`](./tests/fixtures/README.md), including
the honest limits of this evidence.

## How it works

```
operator browser
├── Freighter wallet ── signs authorization entries + transaction envelopes
├── stellar-agent-guard-sdk ── policy encoding, reason vocabulary, event decoding, telemetry
└── @stellar/stellar-sdk ── XDR, transaction building, Soroban RPC
        │
        └──► Soroban RPC (https://soroban-testnet.stellar.org)  [CORS: allow-origin *]
                 │
                 └──► guard contract (custom account) ──► SAC token / protocols
```

Three properties follow from that shape, and each is deliberate:

1. **No secrets, anywhere.** There is no API route that touches a key. The console cannot move funds
   on its own; it can only ask the operator's wallet to sign something the operator can read.
2. **No mock state.** Every number is read from the chain on each refresh, and every read carries its
   own success or failure. A failed read renders as an error — never as a zero that looks exactly
   like an empty policy.
3. **Nothing is broadcast until the enforced simulation passes.** A refused call costs nothing and
   leaves no trace, which is why a refused write has no transaction hash to show.

### Write path

`invokeWithWallet` (`lib/guard/submit.ts`) runs the sequence the Stellar host requires:

1. simulate to discover the authorizations the call needs;
2. wallet-sign each authorization entry the host asked for;
3. simulate again with them attached — this pass runs the **real** `__check_auth`;
4. only then assemble, sign the envelope, and broadcast.

The SDK's own `invoke()` covers steps 1–3 for an *agent key in a process*. It takes `Keypair`s,
because in an agent runtime the key is there. The dashboard must never hold one, so this module
implements the same sequence with a `WalletSigner` standing in — and uses the SDK for everything
else: `policyToScVal`, `decodeCheckResult`, `describePolicy`, `isDeadManFrozen`, `deadManRemaining`,
`GUARD_EVENT_TOPICS`, `decodeAuthDecision`, `GuardTelemetryListener`, `explainReason`.

### Freezes

Two different things can freeze an account, and the console shows them separately because the causes
differ:

- an **admin freeze** — the panic button, `AdminFrozen = true`;
- a **dead-man-switch freeze** — the account went quiet past its grace window
  (`heartbeat_expired`), derived from `LastHeartbeat`, not a flag.

`unfreeze()` clears the admin freeze *and* restarts the heartbeat clock, so it is the way back from
either. The agent's own `heartbeat()` is the other route out of a dead-man freeze, and it needs the
agent's key inside the smart account — it belongs to the SDK's agent runtime, not to this console.

## Running it

```bash
npm install             # installs the vendored Phase 2 SDK tarball
npm run dev             # http://localhost:3000
```

Then connect a Freighter wallet on **testnet** with the admin role for the guard you want to operate,
or deploy a fresh one from the **Configure** page.

```bash
npm run typecheck       # tsc --noEmit
npm run lint            # eslint
npm test                # node --test (no test framework dependency)
npm run build           # next build
npm run prove:phase3    # the real end-to-end run against testnet (writes keys to .env.phase3)
npm run inspect         # read-only dump of an instance's state
```

The proof script creates and funds real testnet accounts. It is idempotent: keys and the deployed
guard are reused from `.env.phase3` on subsequent runs.

## Deployment

Deploys to Vercel as a static-ish Next.js app. There is nothing to configure — no environment
variables, no secrets, no server-side state — because everything happens in the operator's browser
against public RPC.

## Repo family

| Repo | Role |
| --- | --- |
| [stellar-agent-guard-contracts](https://github.com/aigbagbobila/stellar-agent-guard-contracts) | Soroban smart account: `__check_auth` + policy engine |
| [stellar-agent-guard-sdk](https://github.com/aigbagbobila/stellar-agent-guard-sdk) | Agent integration: pre-flight interception, signing, telemetry |
| **stellar-agent-guard-dashboard** (this repo) | Operator interface |

## License

MIT
