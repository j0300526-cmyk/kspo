import { parentPort } from 'node:worker_threads';
import { expose } from 'comlink';
import nodeEndpoint from 'comlink/dist/esm/node-adapter.mjs';
import { createAnalysisEngine } from '../../src/services/analysis-engine.js';
expose(createAnalysisEngine(), nodeEndpoint(parentPort));
