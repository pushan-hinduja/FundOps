/**
 * Process items in parallel batches using Promise.allSettled.
 * Returns arrays of successful results and errors.
 */
export async function processInBatches<T, R>(
  items: T[],
  processFn: (item: T, index: number) => Promise<R>,
  batchSize: number = 5,
  onBatchComplete?: (completed: number, total: number) => void
): Promise<{ results: R[]; errors: { index: number; item: T; error: Error }[] }> {
  const results: R[] = [];
  const errors: { index: number; item: T; error: Error }[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const outcomes = await Promise.allSettled(
      batch.map((item, batchIndex) => processFn(item, i + batchIndex))
    );

    for (let j = 0; j < outcomes.length; j++) {
      const outcome = outcomes[j];
      if (outcome.status === "fulfilled") {
        results.push(outcome.value);
      } else {
        errors.push({
          index: i + j,
          item: batch[j],
          error: outcome.reason instanceof Error ? outcome.reason : new Error(String(outcome.reason)),
        });
      }
    }

    onBatchComplete?.(Math.min(i + batchSize, items.length), items.length);
  }

  return { results, errors };
}
