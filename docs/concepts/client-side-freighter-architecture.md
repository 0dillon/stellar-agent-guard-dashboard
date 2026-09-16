# Client-Side Freighter Architecture

The dashboard is designed under a strict zero-trust principle:

## No Server-Side Private Keys

- No server API routes handle private keys or secrets.
- All write operations construct a `SorobanAuthorizationEntry` and transaction envelope in the operator's browser.
- The user's Freighter extension prompts the operator to review the exact authorization entries and fee parameters before signing.
- Broadcast transactions are submitted directly to Soroban RPC over CORS-enabled endpoints (`https://soroban-testnet.stellar.org`).
