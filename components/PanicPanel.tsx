"use client";

import { useState } from "react";
import type { InvokeResult } from "../lib/guard/submit.ts";
import { freezeGuard, unfreezeGuard } from "../lib/guard/guardOps.ts";
import { refusedEventsFromDiagnostics } from "../lib/guard/telemetry.ts";
import { useGuard } from "./GuardProvider.tsx";
import { ErrorBlock, starLink } from "./bits.tsx";

/**
 * The emergency panic button.
 *
 * The whole point of this panel is that "the UI said it worked" is not the
 * evidence. After a freeze it re-reads `status()` from the chain and shows what
 * the contract itself reports, and it refuses to claim success if the flag did
 * not actually change — a write that was signed and included but did not take
 * effect must not be reported as a freeze.
 */

type Phase = "idle" | "confirming" | "signing" | "verifying" | "done";

interface Report {
  action: "freeze" | "unfreeze";
  result: InvokeResult;
  /** `status()` re-read from the chain after the write. */
  adminFrozenAfter: boolean | null;
  /** True only when the re-read confirms the intended effect. */
  confirmed: boolean;
  note: string;
}

export function PanicPanel() {
  const { signer, guard, server, refresh, snapshot, pushEvents, wallet } = useGuard();
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const alreadyFrozen = snapshot?.status.ok ? snapshot.status.value.admin_frozen : null;

  async function run(action: "freeze" | "unfreeze") {
    setError(null);
    setReport(null);
    setPhase("signing");
    try {
      const walletSigner = signer();
      const result =
        action === "freeze"
          ? await freezeGuard({ server, signer: walletSigner, guard })
          : await unfreezeGuard({ server, signer: walletSigner, guard });

      // Surface any refused-decision diagnostics the write produced, so a refusal
      // appears in the feed rather than only in this panel.
      if (result.kind === "refused") {
        pushEvents(refusedEventsFromDiagnostics(result.diagnosticEvents, guard));
      }

      // Re-read the contract's own view. This is the step that makes the claim
      // real: the UI is not the source of truth, `status()` is.
      setPhase("verifying");
      const { readStatus } = await import("../lib/guard/chain.ts");
      const after = await readStatus(server, guard, wallet?.address);
      const adminFrozenAfter = after.ok ? after.value.admin_frozen : null;
      const expected = action === "freeze";
      const confirmed = adminFrozenAfter !== null && adminFrozenAfter === expected;

      setReport({
        action,
        result,
        adminFrozenAfter,
        confirmed,
        note: !after.ok
          ? `the write returned, but status() could not be re-read to confirm its effect: ${after.error}`
          : confirmed
            ? `status().admin_frozen now reads ${adminFrozenAfter}, which is the ${action} taking effect`
            : `status().admin_frozen reads ${adminFrozenAfter} — the intended effect is NOT visible on chain`,
      });
      setPhase("done");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setPhase("idle");
      setAcknowledged(false);
    }
  }

  return (
    <div className="panel">
      <h2>Emergency</h2>

      <p className="tiny muted">
        Freezing sets the account&apos;s admin freeze, after which <code>__check_auth</code> refuses
        every call the account would make — the agent stops being able to move anything. The freeze is
        reversible: <code>unfreeze()</code> clears it and restarts the heartbeat clock, so it is also
        the way back from a dead-man-switch freeze.
      </p>

      {alreadyFrozen !== null && (
        <p className="tiny">
          Chain currently reports:{" "}
          {alreadyFrozen ? <span className="pill danger">FROZEN</span> : <span className="pill ok">clear</span>}
        </p>
      )}

      {!wallet && <p className="tiny muted">Connect the admin wallet to freeze or unfreeze.</p>}

      {phase !== "confirming" && (
        <div className="row" style={{ marginTop: 12 }}>
          <button
            className="danger"
            disabled={!wallet || alreadyFrozen === true}
            onClick={() => {
              setAcknowledged(false);
              setPhase("confirming");
              setReport(null);
            }}
          >
            Freeze this account
          </button>
          <button
            className="secondary"
            disabled={!wallet || alreadyFrozen === false}
            onClick={() => void run("unfreeze")}
          >
            Unfreeze
          </button>
        </div>
      )}

      {phase === "confirming" && (
        <div className="notice">
          <strong>Confirm the freeze — this stops the agent immediately</strong>
          <p className="tiny">
            The agent will not be able to make any call that requires its authorization until the
            account is unfrozen. This will prompt your wallet to sign an <code>unfreeze</code>-able{" "}
            <code>freeze()</code> call on{" "}
            <span className="mono">{guard.slice(0, 10)}…</span>.
          </p>
          <div className="checkline">
            <input
              id="ack-freeze"
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <label htmlFor="ack-freeze">
              I understand this halts the agent&apos;s spending, and that undoing it needs a second
              signed <code>unfreeze()</code>.
            </label>
          </div>
          <div className="row">
            <button className="danger" disabled={!acknowledged} onClick={() => void run("freeze")}>
              Sign freeze
            </button>
            <button className="secondary" onClick={() => setPhase("idle")}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {(phase === "signing" || phase === "verifying") && (
        <div className="notice info">
          <strong>{phase === "signing" ? "Waiting for the wallet…" : "Verifying on chain…"}</strong>
          <span className="tiny">
            {phase === "signing"
              ? "Two signatures may be requested: one for the authorization entry, one for the transaction envelope."
              : "Re-reading status() to confirm the account's own view changed."}
          </span>
        </div>
      )}

      {error && <ErrorBlock title="The freeze could not be completed" detail={error} />}

      {report && (
        <div className={report.confirmed ? "notice info" : "error"}>
          <strong>
            {report.confirmed
              ? `${report.action === "freeze" ? "Freeze" : "Unfreeze"} confirmed on chain`
              : `${report.action === "freeze" ? "Freeze" : "Unfreeze"} NOT confirmed`}
          </strong>
          <span className="tiny">{report.note}</span>

          {report.result.kind === "submitted" && (
            <p className="tiny" style={{ marginTop: 6 }}>
              transaction {starLink(report.result.hash)} · included in ledger{" "}
              {report.result.ledger ?? "—"}
            </p>
          )}
          {report.result.kind === "refused" && (
            <p className="tiny" style={{ marginTop: 6 }}>
              Nothing was broadcast. Refused during {report.result.stage}:{" "}
              <span className="mono">{report.result.detail}</span>
            </p>
          )}
          {report.result.kind === "failed" && (
            <p className="tiny" style={{ marginTop: 6 }}>
              Transaction {starLink(report.result.hash)} was included and rejected:{" "}
              <span className="mono">{report.result.detail}</span>
            </p>
          )}

          {report.result.kind !== "submitted" && (
            <p className="tiny muted" style={{ marginTop: 6 }}>
              A refused call has no transaction hash by construction — it was never broadcast. That is
              the pre-flight path working, not a missing receipt.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
