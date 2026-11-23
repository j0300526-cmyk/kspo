import { wrap, releaseProxy } from 'comlink';
import { createAnalysisEngine } from './analysis-engine.js';

export class AnalysisClient {
  constructor({
    workerFactory = () =>
      new Worker(new URL('../workers/analysis.worker.js', import.meta.url), { type: 'module' }),
    timeoutMs = 30000,
    onMode = () => {},
  } = {}) {
    this.workerFactory = workerFactory;
    this.timeoutMs = timeoutMs;
    this.onMode = onMode;
    this.mode = 'starting';
    this.key = null;
    this.generation = 0;
    this.ready = this.start();
  }
  async start() {
    try {
      this.worker = this.workerFactory();
      this.remote = wrap(this.worker);
      this.failure = new Promise((_, reject) => {
        this.rejectFailure = reject;
      });
      this.failure.catch(() => {});
      this.worker.addEventListener('error', () =>
        this.rejectFailure(new Error('분석 워커가 종료되었습니다.')),
      );
      this.worker.addEventListener('messageerror', () =>
        this.rejectFailure(new Error('분석 워커 응답을 읽지 못했습니다.')),
      );
      await this.withTimeout(this.remote.ping(), 5000);
      this.mode = 'worker';
    } catch {
      this.fallback();
    }
    this.onMode(this.mode);
  }
  withTimeout(promise, timeout = this.timeoutMs) {
    let timer;
    return Promise.race([
      promise,
      this.failure,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('분석 응답 시간 초과')), timeout);
      }),
    ]).finally(() => clearTimeout(timer));
  }
  fallback() {
    this.worker?.terminate();
    try {
      this.remote?.[releaseProxy]?.();
    } catch {}
    this.remote = createAnalysisEngine();
    this.key = null;
    this.mode = 'cooperative';
    this.onMode(this.mode);
  }
  cancel() {
    this.generation++;
    this.remote?.cancel()?.catch?.(() => {});
  }
  async run(method, input, { key, observers }) {
    const generation = this.generation;
    await this.ready;
    const execute = async () => {
      if (this.key !== key) {
        await this.remote.setObservers(key, observers);
        this.key = key;
      }
      return this.remote[method](input);
    };
    try {
      return this.mode === 'worker' ? await this.withTimeout(execute()) : await execute();
    } catch (error) {
      if (error.name === 'AbortError' || generation !== this.generation) throw error;
      if (this.mode !== 'worker') throw error;
      this.fallback();
      return execute();
    }
  }
  dispose() {
    this.cancel();
    this.worker?.terminate();
  }
}
