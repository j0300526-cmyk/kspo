import {
  createIcons,
  ScanEye,
  Box,
  Layers3,
  Camera,
  Volume2,
  SlidersHorizontal,
  Plus,
  Download,
  Upload,
  FileText,
  Database,
  RotateCcw,
  Maximize,
  Eye,
  Move3d,
  Grid2x2,
  Sparkles,
  Trash2,
  X,
  Check,
  Info,
  Monitor,
  Save,
  MapPin,
  PanelTop,
  ArrowDownToLine,
  Focus,
  Copy,
  Undo2,
} from 'lucide';
const iconSet = {
  ScanEye,
  Box,
  Layers3,
  Camera,
  Volume2,
  SlidersHorizontal,
  Plus,
  Download,
  Upload,
  FileText,
  Database,
  RotateCcw,
  Maximize,
  Eye,
  Move3d,
  Grid2x2,
  Sparkles,
  Trash2,
  X,
  Check,
  Info,
  Monitor,
  Save,
  MapPin,
  PanelTop,
  ArrowDownToLine,
  Focus,
  Copy,
  Undo2,
};
export const icons = () => createIcons({ icons: iconSet, attrs: { 'aria-hidden': 'true' } });
export const ico = (name) => `<i data-lucide="${name}"></i>`;
export const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const $ = (selector) => document.querySelector(selector);
export function numberField(id, label, value, min, max, unit = 'm') {
  return `<label>${label}<div class="number-wrap"><input id="${id}" class="form-control" type="number" step="0.1" min="${min}" max="${max}" value="${value}" aria-label="${label}"/><span>${unit}</span></div></label>`;
}
export function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 3500);
}
export function modal(title, body, id = 'modal') {
  const el = $('dialog');
  el.id = id;
  el.innerHTML = `<div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" id="close-modal" aria-label="닫기">${ico('x')}</button></div><div class="modal-body">${body}</div>`;
  $('#close-modal').onclick = () => el.close();
  if (!el.open) el.showModal();
  icons();
  return el;
}
export function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
