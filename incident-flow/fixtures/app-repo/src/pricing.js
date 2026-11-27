/**
 * Apply a percent discount code to a cart subtotal.
 * Intentional bug for the bug-fix agent demo: SAVE10 is recognized in
 * the UI banner path but never reduces the total (wrong comparison).
 */
export function applyDiscount(subtotal, code) {
  if (typeof subtotal !== "number" || subtotal < 0) {
    throw new Error("invalid_subtotal");
  }
  const normalized = String(code ?? "")
    .trim()
    .toUpperCase();

  // BUG: compares to the wrong code, so SAVE10 never matches.
  if (normalized === "SAVE100") {
    return Number((subtotal * 0.9).toFixed(2));
  }
  return subtotal;
}

export function discountBanner(code) {
  const normalized = String(code ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "SAVE10") {
    return "10% off applied";
  }
  return null;
}
