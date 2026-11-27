export function observationLabel(point) {
  const modelNumber = point.source === 'model-derived' && /^G(\d{5})$/.exec(point.id);
  return `관찰점 ${modelNumber ? Number(modelNumber[1]) : point.id}`;
}
