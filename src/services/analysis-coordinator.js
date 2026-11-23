// One running job plus one replaceable pending job; stale results never commit.
export function createAnalysisCoordinator(
  client,
  { onResult, onError = () => {}, onBusy = () => {} },
) {
  let revision = 0,
    pending = null,
    running = false,
    disposed = false,
    timer,
    waiters = [];
  const settle = (error) => {
    const list = waiters;
    waiters = [];
    for (const { resolve, reject } of list) error ? reject(error) : resolve();
  };
  async function pump() {
    if (running || disposed) return;
    running = true;
    try {
      while (pending && !disposed) {
        const job = pending;
        pending = null;
        try {
          const result = await client.run('analyze', job.input, job.observations);
          if (job.revision === revision && !disposed) onResult(result, job.revision);
        } catch (error) {
          if (job.revision === revision && error.name !== 'AbortError') {
            onError(error);
            settle(error);
          }
        }
      }
    } finally {
      running = false;
      if (!pending) {
        onBusy(false);
        settle();
      } else pump();
    }
  }
  return {
    request(input, observations) {
      revision++;
      client.cancel();
      pending = { input, observations, revision };
      onBusy(true);
      clearTimeout(timer);
      timer = setTimeout(pump, 40);
      return revision;
    },
    flush() {
      clearTimeout(timer);
      if (!running && !pending) return Promise.resolve();
      const result = new Promise((resolve, reject) => waiters.push({ resolve, reject }));
      pump();
      return result;
    },
    get revision() {
      return revision;
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      client.dispose();
      settle(new Error('분석 서비스가 종료되었습니다.'));
    },
  };
}
