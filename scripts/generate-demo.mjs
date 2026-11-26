import fs from 'node:fs/promises';
import {defaultProject,parseObservations} from '../src/domain/project-schema.js';
import {createAnalysisEngine} from '../src/services/analysis-engine.js';
const project=defaultProject();
project.name='가상 장비 배치 · KSPO DOME 비교 예제';
project.baseline=structuredClone({stage:project.stage,equipment:project.equipment});
const points=parseObservations(JSON.parse(await fs.readFile('public/models/observation-points.json','utf8')));
const engine=createAnalysisEngine();engine.setObservers('official',points);
for(const id of project.equipment.map(e=>e.id)){
 const result=await engine.optimize({stage:project.stage,equipment:project.equipment,selectedId:id});
 project.equipment=result.equipment;
}
await fs.mkdir('src/data',{recursive:true});
await fs.writeFile('src/data/demo-project.json',JSON.stringify(project,null,2)+'\n');
console.log('Regenerated hypothetical comparison fixture from official observations.');
