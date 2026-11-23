import { get, set } from 'idb-keyval';
import { parseProject } from '../domain/project-schema.js';
const KEY = 'garim-zero-v1';
export function createProjectStorage({
  indexed = () => typeof indexedDB !== 'undefined',
  read = get,
  write = set,
  local = globalThis.localStorage,
  onStatus = () => {},
} = {}) {
  let timer,
    pending = null,
    latest = null,
    chain = Promise.resolve();
  async function save(value) {
    try {
      if (indexed()) {
        await write(KEY, value);
        onStatus('기기에 저장됨');
        return;
      }
      local?.setItem(KEY, JSON.stringify(value));
      onStatus('브라우저에 저장됨');
    } catch {
      try {
        local?.setItem(KEY, JSON.stringify(value));
        onStatus('브라우저에 저장됨');
      } catch {
        onStatus('자동 저장 불가 · 파일로 저장하세요');
      }
    }
  }
  const flush = () => {
    clearTimeout(timer);
    if (pending) {
      const value = pending;
      pending = null;
      chain = chain.then(() => save(value));
    }
    return chain;
  };
  return {
    async load() {
      let value, fallback;
      try {
        if (indexed()) value = await read(KEY);
      } catch {}
      try {
        fallback = JSON.parse(local?.getItem(KEY) || 'null');
      } catch {}
      const candidates = [value, fallback]
        .filter(Boolean)
        .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      for (const candidate of candidates) {
        try {
          return parseProject(candidate);
        } catch {}
      }
      if (candidates.length) onStatus('이전 저장 파일을 읽지 못했습니다.');
      return null;
    },
    schedule(value) {
      pending = { ...structuredClone(value), savedAt: Date.now() };
      latest = pending;
      clearTimeout(timer);
      onStatus('저장 대기');
      timer = setTimeout(flush, 350);
    },
    flush,
    recover() {
      try {
        if (latest) local?.setItem(KEY, JSON.stringify(latest));
      } catch {}
    },
    dispose() {
      return flush();
    },
  };
}
