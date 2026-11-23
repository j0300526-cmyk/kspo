import { createStore } from 'zustand/vanilla';
import { parseProject, defaultProject } from '../domain/project-schema.js';
export function createProjectStore(initial = defaultProject()) {
  const store = createStore(() => ({
    project: parseProject(initial),
    history: [],
    selectedId: initial.equipment[0]?.id ?? null,
    selectedPointId: null,
    analysis: null,
    prior: null,
    busy: false,
    error: null,
  }));
  const edit = (mutate, { history = true, group = null } = {}) => {
    const state = store.getState(),
      draft = structuredClone(state.project);
    mutate(draft);
    const next = parseProject(draft);
    const past =
      history && (!group || state.historyGroup !== group)
        ? [...state.history, state.project].slice(-30)
        : state.history;
    store.setState({
      project: next,
      history: past,
      historyGroup: group,
      selectedId: next.equipment.some((e) => e.id === state.selectedId)
        ? state.selectedId
        : (next.equipment[0]?.id ?? null),
    });
  };
  return Object.assign(store, {
    edit,
    undo() {
      const s = store.getState();
      if (!s.history.length) return;
      const next = s.history.at(-1);
      store.setState({
        project: next,
        history: s.history.slice(0, -1),
        historyGroup: null,
        selectedPointId: null,
        selectedId: next.equipment.some((e) => e.id === s.selectedId)
          ? s.selectedId
          : (next.equipment[0]?.id ?? null),
      });
    },
    replace(value) {
      const next = parseProject(value);
      store.setState((s) => ({
        project: next,
        history: [...s.history, s.project].slice(-30),
        historyGroup: null,
        selectedId: next.equipment[0]?.id ?? null,
        selectedPointId: null,
      }));
    },
  });
}
