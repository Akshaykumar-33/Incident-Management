import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyDiscount, discountBanner } from "./pricing.js";

describe("applyDiscount", () => {
  it("applies SAVE10 as 10% off", () => {
    assert.equal(applyDiscount(40, "SAVE10"), 36);
  });

  it("leaves unknown codes unchanged", () => {
    assert.equal(applyDiscount(40, "NOPE"), 40);
  });
});

describe("discountBanner", () => {
  it("shows banner for SAVE10", () => {
    assert.equal(discountBanner("SAVE10"), "10% off applied");
  });
});
