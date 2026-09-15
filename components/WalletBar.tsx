"use client";

import { useState } from "react";
import { useGuard } from "./GuardProvider.tsx";
import { ErrorBlock, short } from "./bits.tsx";
import { looksLikeContractAddress } from "../lib/guard/instance.ts";

export function WalletBar() {
  const { wallet, walletError, connecting, connect, disconnect, instances, guard, selectGuard, addInstance } =
    useGuard();
  const [newAddress, setNewAddress] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const selected = instances.find((instance) => instance.guard === guard);

  return (
    <div className="panel">
      <div className="split">
        <div>
          <label className="field">
            <span className="lbl">Guarded account (the smart account being operated)</span>
            <select value={guard} onChange={(event) => selectGuard(event.target.value)}>
              {instances.map((instance) => (
                <option key={instance.guard} value={instance.guard}>
                  {instance.label} — {short(instance.guard, 8, 6)}
                </option>
              ))}
            </select>
            <span className="hint">{selected?.provenance}</span>
          </label>
          <div className="row">
            <input
              value={newAddress}
              onChange={(event) => {
                setNewAddress(event.target.value);
                setAddError(null);
              }}
              placeholder="Add a guard contract address (C…)"
              aria-label="Guard contract address"
            />
            <button
              className="secondary"
              onClick={() => {
                const candidate = newAddress.trim();
                if (!looksLikeContractAddress(candidate)) {
                  setAddError("That is not a Soroban contract address (52 characters, starting with C).");
                  return;
                }
                addInstance(candidate, `Guard ${short(candidate, 6, 4)}`);
                setNewAddress("");
              }}
            >
              Add
            </button>
          </div>
          {addError && <ErrorBlock title="Could not add that instance" detail={addError} />}
        </div>

        <div>
          <span className="lbl muted" style={{ fontSize: 12.5 }}>
            Admin wallet
          </span>
          <div className="row" style={{ marginTop: 5 }}>
            {wallet ? (
              <>
                <span className="pill ok">connected</span>
                <span className="mono">{short(wallet.address, 8, 6)}</span>
                <button className="secondary" onClick={disconnect}>
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={() => void connect()} disabled={connecting}>
                {connecting ? "Waiting for wallet…" : "Connect admin wallet"}
              </button>
            )}
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            Every write on this page is signed by this wallet inside the Freighter extension and
            broadcast straight to Soroban RPC. The console never sees, stores or transmits a secret
            key, and there is no server component that could hold one.
          </p>
          {walletError && <ErrorBlock title="Wallet connection" detail={walletError} />}
        </div>
      </div>
    </div>
  );
}
