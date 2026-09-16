import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rotateAgentKey } from "../../lib/guard/guardOps.js";

describe("rotateAgentKey", () => {
  it("refuses pubkeys that are not 32 bytes hex", async () => {
    const res = await rotateAgentKey({
      server: {} as any,
      signer: { address: "GBXXXXX" } as any,
      guard: "CAXXXXX",
      newAgentPubkeyHex: "1234",
    });

    assert.equal(res.kind, "refused");
    if (res.kind === "refused") {
      assert.match(res.detail, /must be 32 raw Ed25519 bytes/);
    }
  });
});
