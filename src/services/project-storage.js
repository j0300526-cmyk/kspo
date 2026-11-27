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
        onStatus('기기에 저장했어요');
        return;
      }
      local?.setItem(KEY, JSON.stringify(value));
      onStatus('이 브라우저에 저장했어요');
    } catch {
      try {
        local?.setItem(KEY, JSON.stringify(value));
        onStatus('이 브라우저에 저장했어요');
      } catch {
        onStatus('자동 저장을 확인해 주세요. 프로젝트를 JSON 파일로 저장할 수 있어요.');
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
      if (candidates.length)
        onStatus('이전 배치를 읽지 못했어요. 저장한 JSON 파일을 불러와 주세요.');
      return null;
    },
    schedule(value) {
      pending = { ...structuredClone(value), savedAt: Date.now() };
      latest = pending;
      clearTimeout(timer);
      onStatus('변경 내용을 저장하고 있어요');
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
