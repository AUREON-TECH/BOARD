import {loadProject,serializeProject} from './model.js';

export const STORAGE_KEY='board.project.v2';
export const LEGACY_STORAGE_KEY='board.project.v1';

export function readStoredProject(storage=localStorage){
  for(const key of [STORAGE_KEY,LEGACY_STORAGE_KEY]){
    try{
      const raw=storage.getItem(key);if(!raw)continue;
      const parsed=JSON.parse(raw);
      if((parsed?.version===2&&Array.isArray(parsed.pages))||Array.isArray(parsed?.slides))return loadProject(parsed);
    }catch{}
  }
  return loadProject(null);
}

export function writeStoredProject(storage,project){
  const target=storage||localStorage;
  target.setItem(STORAGE_KEY,serializeProject(project));
  return project;
}
