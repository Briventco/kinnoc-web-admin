import { useCallback, useEffect, useState } from 'react';

interface Result<T> {
  load: unknown;
  attempt: number;
  data?: T;
  error?: unknown;
}

/**
 * Runs `load` (memoize it with useCallback) and tracks its result. It re-runs
 * when `load` changes or `reload()` is called; stale responses are discarded
 * and in-flight requests are aborted.
 */
export function useAsync<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ load, attempt, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setResult({ load, attempt, error });
      },
    );
    return () => controller.abort();
  }, [load, attempt]);

  const current = result && result.load === load && result.attempt === attempt ? result : null;
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    data: current?.data,
    error: current?.error,
    loading: current === null,
    /** The last successful result of this `load`, kept while `reload()` runs. */
    latest: result && result.load === load ? result.data : undefined,
    reload,
  };
}
