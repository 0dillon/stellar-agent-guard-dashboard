# No Mock State

The dashboard enforces a strict "no mock state" policy:

- Every number, balance, cap, and allowlist is fetched on-demand from Soroban RPC.
- Failed reads are rendered as discrete warning alerts rather than default zeros (which could be misconstrued as an empty policy).
- Write operations are never marked successful based on RPC acceptance alone; the contract state is re-queried to verify changes.
