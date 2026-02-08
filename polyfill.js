/**
 * Polyfill for Array.prototype.toReversed (ES2023 / Node 20+)
 * Required when running Expo on Node 18
 */
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    return [...this].reverse();
  };
}
