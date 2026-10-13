export type BulkPricingAttempt = { signature: string; key: string };

export function bulkPricingAttempt(previous: BulkPricingAttempt | null, input: unknown, createKey: () => string): BulkPricingAttempt {
  const signature = JSON.stringify(input);
  return previous?.signature === signature ? previous : { signature, key: createKey() };
}
