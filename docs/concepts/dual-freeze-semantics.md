# Dual-Freeze Semantics

Stellar Agent Guard provides two independent freeze mechanisms:

1. **Admin Freeze (`admin_frozen = true`)**:
   - Triggered manually by the operator via the Panic Button.
   - Requires admin wallet signature to freeze and unfreeze.
2. **Dead-Man Switch Freeze (`heartbeat_expired`)**:
   - Triggered automatically when an agent fails to broadcast a `heartbeat()` within the configured grace period.
   - Derived on-chain from `last_heartbeat` and `current_ledger_timestamp`.
   - Can be unpinned by an admin `unfreeze()` or restored by an agent `heartbeat()`.

The UI renders separate diagnostic cards and badges for each freeze type so operators never mistake a missed heartbeat for an administrative lockout.
