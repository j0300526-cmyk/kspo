import { expose } from 'comlink';
import { createAnalysisEngine } from '../services/analysis-engine.js';
expose(createAnalysisEngine());
