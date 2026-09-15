import assert from "node:assert/strict";
import { test } from "node:test";
import { describeRejectedResult } from "../../lib/guard/submit.ts";

/**
 * The shapes here are taken from a real rejection observed during the Phase 3
 * proof: a `create_contract` submitted without its recorded authorization entry.
 * The RPC returned `resultXdr` as an already-decoded object, not the base64 the
 * API documents, and the only readable reason lived in a diagnostic event.
 */
const REAL_RESULT_XDR = {
  result: { tx_failed: [{ op_inner: { invoke_host_function: "trapped" } }] },
};

const REAL_DIAGNOSTIC = {
  in_successful_contract_call: false,
  event: {
    ext: "v0",
    contract_id: null,
    type: "diagnostic",
    body: {
      v0: {
        topics: [{ symbol: "error" }, { error: { auth: "invalid_action" } }],
        data: {
          vec: [
            { string: "Unauthorized function call for address" },
            { address: "GA76DICZHOAA3L2OUCHG4X6J6DMM2NDEPLUWMK4PVLR2YTXZADHJZIXD" },
          ],
        },
      },
    },
  },
};

test("a decoded resultXdr object is described, not discarded", () => {
  const text = describeRejectedResult({ resultXdr: REAL_RESULT_XDR, ledger: 4691546 });
  assert.match(text, /ledger 4691546/);
  assert.match(text, /tx_failed/);
  assert.match(text, /trapped/);
});

test("the host's own reason is lifted into the description", () => {
  const text = describeRejectedResult({
    resultXdr: REAL_RESULT_XDR,
    ledger: 100,
    diagnosticEventsXdr: [REAL_DIAGNOSTIC],
  });
  // "trapped" alone is not a diagnosis; the address the host refused is.
  assert.match(text, /Unauthorized function call for address/);
  assert.match(text, /invalid_action/);
});

test("base64 resultXdr is decoded when the API returns it in that shape", () => {
  const base64 = "AAAAAAABAAAAAAAAAAAAAAA=";
  const text = describeRejectedResult({ resultXdr: base64 });
  assert.notEqual(text, "no result data returned by the network");
});

test("a result with nothing usable still returns a sentence, never an empty string", () => {
  assert.equal(describeRejectedResult({}), "no result data returned by the network");
  assert.equal(describeRejectedResult(null), "no result data returned by the network");
});

test("diagnostics without an error topic are ignored rather than misread as the reason", () => {
  const noise = { event: { body: { v0: { topics: [{ symbol: "fn_call" }], data: "void" } } } };
  const text = describeRejectedResult({ resultXdr: REAL_RESULT_XDR, diagnosticEventsXdr: [noise] });
  assert.doesNotMatch(text, /host:/);
  assert.match(text, /tx_failed/);
});

test("a long description is bounded so it cannot flood a UI", () => {
  const text = describeRejectedResult({ resultXdr: { result: { tx_failed: "x".repeat(5000) } } });
  assert.ok(text.length < 400, `description should be bounded, got ${text.length} characters`);
});
