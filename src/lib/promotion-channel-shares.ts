/** Round channel percentages together so a nonempty distribution totals 100. */
export function promotionChannelShares(counts: readonly number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) return counts.map(() => 0);
  const exact = counts.map(count => count / total * 100);
  const shares = exact.map(Math.floor);
  const order = exact.map((value, index) => ({ index, remainder: value - shares[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const remaining = 100 - shares.reduce((sum, share) => sum + share, 0);
  for (let index = 0; index < remaining; index += 1) shares[order[index].index] += 1;
  return shares;
}
