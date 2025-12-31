/**
 * IndexedDB wrapper exports
 * 
 * Barrel export for clean imports from other modules
 */

export {
  getDB,
  closeDB,
  isIndexedDBAvailable,
  DB_NAME,
  STORE_NAME,
  STATISTICS_STORE_NAME,
  DB_VERSION,
  INDEX_NAMES,
  type RecruitingDBSchema,
  type Statistics,
} from './db';

