import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { get, set, createStore } from 'idb-keyval';
import { createProjectStorage } from '../src/services/project-storage.js';
import { defaultProject } from '../src/domain/project-schema.js';
import { createProjectStore } from '../src/app/store.js';

test('async IndexedDB autosave coalesces changes and migrates valid v1 local projects', async () => {
  globalThis.indexedDB = new IDBFactory();
  const db = createStore('test-projects', 'projects'),
    p = defaultProject();
  let writes = 0;
  const local = {
    getItem: () => JSON.stringify(p),
    setItem() {
      throw new Error('Unexpected fallback');
    },
  };
  const storage = createProjectStorage({
    indexed: () => true,
    read: (key) => get(key, db),
    write: async (key, value) => {
      writes++;
      await set(key, value, db);
    },
    local,
  });
  assert.equal((await storage.load()).name, p.name);
  storage.schedule({ ...p, name: 'A' });
  storage.schedule({ ...p, name: 'B' });
  await storage.flush();
  assert.equal(writes, 1);
  assert.equal((await storage.load()).name, 'B');
});
test('undo groups continuous rotation and retains a validated baseline across save/load', () => {
  const store = createProjectStore(),
    id = store.getState().selectedId;
  for (const rotation of [5, 10, 15])
    store.edit(
      (p) => {
        p.equipment.find((e) => e.id === id).rotation = rotation;
      },
      { group: 'gesture-1' },
    );
  assert.equal(store.getState().history.length, 1);
  store.undo();
  assert.equal(store.getState().project.equipment[0].rotation, 0);
  store.edit((p) => {
    p.baseline = { stage: structuredClone(p.stage), equipment: structuredClone(p.equipment) };
  });
  const restored = createProjectStore(JSON.parse(JSON.stringify(store.getState().project)));
  assert.equal(restored.getState().project.baseline.equipment.length, 3);
});

test('newer recovery snapshot wins over an older IndexedDB value', async () => {
  const p = defaultProject();
  let raw;
  const storage = createProjectStorage({
    indexed: () => true,
    read: async () => ({ ...p, name: 'old', savedAt: 1 }),
    write: async () => {
      throw new Error('Quota');
    },
    local: {
      getItem: () => raw,
      setItem: (key, value) => {
        raw = value;
      },
    },
  });
  storage.schedule({ ...p, name: 'recovered' });
  storage.recover();
  await storage.flush();
  assert.equal((await storage.load()).name, 'recovered');
});
