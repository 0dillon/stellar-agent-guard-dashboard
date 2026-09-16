# Panic Button & Emergency Freeze

The `PanicPanel` component handles crisis response:

1. Operator clicks **Emergency Freeze**.
2. A confirmation modal requires the operator to confirm the action.
3. Freighter requests signature for `freeze()` transaction.
4. Transaction submits to Soroban RPC.
5. The dashboard re-reads `status()` from the contract to verify `admin_frozen = true`.
6. Once verified, the UI updates to the frozen state and exposes the **Unfreeze** action.
