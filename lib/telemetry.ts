export async function traceSlowOperation<T>(
  operationName: string,
  fn: () => Promise<T>,
  thresholdMs = 500
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = Math.round(performance.now() - start);
    if (durationMs >= thresholdMs) {
      console.warn(
        JSON.stringify({
          level: "warn",
          type: "slow_backend_operation",
          operation: operationName,
          durationMs,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
