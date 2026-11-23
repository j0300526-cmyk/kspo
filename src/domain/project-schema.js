import { z } from 'zod';
import { DEFAULT_STAGE, DEFAULT_EQUIPMENT, clone } from './defaults.js';
const n = (min, max) => z.number().finite().min(min).max(max);
export const stageSchema = z.object({
  x: n(-50, 50),
  z: n(-50, 50),
  width: n(1, 50),
  depth: n(1, 50),
  height: n(0, 10),
  targetHeight: n(0, 10),
});
export const equipmentSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(80),
  type: z.enum(['camera', 'speaker', 'console', 'screen']),
  x: n(-50, 50),
  z: n(-50, 50),
  width: n(0.3, 20),
  depth: n(0.3, 20),
  height: n(0.3, 20),
  rotation: n(-180, 180),
});
const equipments = z
  .array(equipmentSchema)
  .max(30)
  .refine((v) => new Set(v.map((e) => e.id)).size === v.length, '장비 ID가 중복되었습니다.');
const point = z.object({
  id: z.string().min(1).max(100),
  x: n(-200, 200),
  y: n(-200, 200),
  z: n(-200, 200),
  source: z.enum(['official-surface', 'manual']).default('manual'),
  block: z.union([z.string(), z.number()]).default('직접 지정'),
  row: z.number().default(0),
});
export const projectSchema = z.object({
  version: z.literal(1),
  name: z.string().max(70).default('KSPO DOME · 무대 배치안'),
  stage: stageSchema,
  equipment: equipments,
  customPoints: z
    .array(point)
    .max(100)
    .default([])
    .refine((v) => new Set(v.map((e) => e.id)).size === v.length, '관찰점 ID가 중복되었습니다.'),
  observerMode: z.enum(['official', 'design', 'custom']).default('official'),
  customModel: z.string().max(150).nullable().default(null),
  baseline: z.object({ stage: stageSchema, equipment: equipments }).nullable().default(null),
});
export function parseProject(value) {
  const result = projectSchema.safeParse(value);
  if (!result.success)
    throw new Error('프로젝트 파일 형식을 확인해주세요. ' + result.error.issues[0].message);
  return result.data;
}
export function validateProject(value) {
  const p = parseProject(value);
  return { version: 1, stage: p.stage, equipment: p.equipment };
}
export const defaultProject = () =>
  parseProject({ version: 1, stage: clone(DEFAULT_STAGE), equipment: clone(DEFAULT_EQUIPMENT) });
export function parseObservations(value) {
  return z
    .object({
      points: z
        .array(
          z.object({
            id: z.string().min(1).max(100),
            position: z.tuple([n(-300, 300), n(-50, 100), n(-300, 300)]),
          }),
        )
        .max(50000),
    })
    .parse(value)
    .points.map((p) => ({
      id: p.id,
      x: p.position[0],
      y: p.position[1],
      z: p.position[2],
      source: 'model-derived',
      block: '의자 형상 추출',
      row: 0,
    }));
}
