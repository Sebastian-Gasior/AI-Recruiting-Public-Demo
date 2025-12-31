/**
 * IndexedDB database setup using idb wrapper
 * 
 * Provides Promise-based IndexedDB API for profile storage.
 * Database: ai-recruiting-db
 * Store: profiles
 * 
 * @see https://github.com/jakearchibald/idb
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Profile } from '../../types/profile.types';

/**
 * Database name constant
 * @constant
 */
export const DB_NAME = 'ai-recruiting-db';

/**
 * Store name constant
 * @constant
 */
export const STORE_NAME = 'profiles';
export const STATISTICS_STORE_NAME = 'statistics';

/**
 * Database version
 * Increment this when schema changes are needed
 * @constant
 */
export const DB_VERSION = 2;

/**
 * Index names for type-safe index access
 * @constant
 */
export const INDEX_NAMES = {
  BY_NAME: 'by-name',
  BY_CREATED_AT: 'by-createdAt',
} as const;

/**
 * Statistics data structure
 */
export interface Statistics {
  id: 'statistics'; // Single record with fixed ID
  total_analyses: number;
  role_cluster_counts: Record<string, number>;
  industry_cluster_counts: Record<string, number>;
  ats_score_buckets: Record<string, number>;
}

/**
 * Database schema interface
 * Extends DBSchema from idb for type-safe database operations
 */
export interface RecruitingDBSchema extends DBSchema {
  profiles: {
    key: string; // Profile.id (UUID)
    value: Profile; // Profile type from types/profile.types.ts
    indexes: {
      'by-name': string; // Index for querying by profile name
      'by-createdAt': string; // Index for querying by creation date
    };
  };
  statistics: {
    key: string; // 'statistics' (single record)
    value: Statistics;
    indexes: {}; // No indexes needed for single record
  };
}

/**
 * Database instance (lazy initialization)
 * Will be initialized on first use via getDB()
 */
let dbInstance: IDBPDatabase<RecruitingDBSchema> | null = null;

/**
 * Promise for database initialization (prevents race conditions)
 * Multiple concurrent calls to getDB() will share this promise
 */
let initPromise: Promise<IDBPDatabase<RecruitingDBSchema>> | null = null;

/**
 * Migration functions for database version upgrades
 * Key: target version, Value: migration function
 */
type MigrationFunction = (
  db: IDBPDatabase<RecruitingDBSchema>,
  oldVersion: number,
  newVersion: number | null,
  transaction: IDBTransaction
) => void;

const migrations: Map<number, MigrationFunction> = new Map([
  // Version 1: Initial schema (no migration needed)
  // Version 2: Add statistics store
  [
    2,
    (db, oldVersion, newVersion, transaction) => {
      // Create statistics store if it doesn't exist
      if (!db.objectStoreNames.contains(STATISTICS_STORE_NAME)) {
        db.createObjectStore(STATISTICS_STORE_NAME, {
          keyPath: 'id',
        });
      }
    },
  ],
]);

/**
 * Initialize the IndexedDB database
 * 
 * Creates the database and object store if they don't exist.
 * Handles version upgrades for future schema changes.
 * 
 * @returns Promise resolving to the database instance
 * @throws Error if IndexedDB is not available or initialization fails
 */
async function initDB(): Promise<IDBPDatabase<RecruitingDBSchema>> {
  try {
    const db = await openDB<RecruitingDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // This callback runs when:
        // 1. Database doesn't exist (oldVersion = 0)
        // 2. Database version is being upgraded (oldVersion < newVersion)

        // Create profiles object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id', // Profile.id is the primary key (UUID validation happens in Profile Service)
          });

          // Create indexes for efficient queries
          // Index by profile name for searching/filtering
          store.createIndex(INDEX_NAMES.BY_NAME, 'name', { unique: false });
          
          // Index by creation date for sorting by date
          store.createIndex(INDEX_NAMES.BY_CREATED_AT, 'createdAt', { unique: false });
        }

        // Create statistics object store if it doesn't exist
        if (!db.objectStoreNames.contains(STATISTICS_STORE_NAME)) {
          db.createObjectStore(STATISTICS_STORE_NAME, {
            keyPath: 'id',
          });
        }

        // Run migrations for each version upgrade
        for (let version = oldVersion + 1; version <= (newVersion ?? DB_VERSION); version++) {
          const migration = migrations.get(version);
          if (migration) {
            migration(db, oldVersion, newVersion, transaction);
          }
        }
      },
    });

    return db;
  } catch (error) {
    // Handle IndexedDB not available (e.g., in private browsing mode)
    if (error instanceof DOMException) {
      throw new Error(
        'IndexedDB ist nicht verfügbar. Bitte verwenden Sie einen modernen Browser und deaktivieren Sie den privaten Modus.'
      );
    }

    // Re-throw other errors with context
    throw new Error(
      `Fehler beim Initialisieren der Datenbank: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    );
  }
}

/**
 * Check if database instance is still open and valid
 * 
 * @param db - Database instance to check
 * @returns true if database is open and valid, false otherwise
 */
function isDBOpen(db: IDBPDatabase<RecruitingDBSchema> | null): boolean {
  if (!db) {
    return false;
  }

  try {
    // Check if database is still open by accessing objectStoreNames
    // This will throw if the database is closed
    db.objectStoreNames;
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the database instance (lazy initialization)
 * 
 * Initializes the database on first call and reuses the instance
 * for subsequent calls. This ensures the database is only opened once.
 * Uses promise-based synchronization to prevent race conditions when
 * multiple calls happen concurrently.
 * 
 * @returns Promise resolving to the initialized database instance
 * @throws Error if IndexedDB is not available
 */
export async function getDB(): Promise<IDBPDatabase<RecruitingDBSchema>> {
  // Check IndexedDB availability first
  if (!isIndexedDBAvailable()) {
    throw new Error(
      'IndexedDB ist nicht verfügbar. Bitte verwenden Sie einen modernen Browser und deaktivieren Sie den privaten Modus.'
    );
  }

  // Check if we have a valid instance
  if (dbInstance && isDBOpen(dbInstance)) {
    return dbInstance;
  }

  // Reset invalid instance
  if (dbInstance && !isDBOpen(dbInstance)) {
    dbInstance = null;
  }

  // If initialization is already in progress, return the existing promise
  if (initPromise) {
    return initPromise;
  }

  // Start initialization and store promise to prevent race conditions
  initPromise = initDB()
    .then((db) => {
      dbInstance = db;
      initPromise = null; // Clear promise after successful initialization
      return db;
    })
    .catch((error) => {
      initPromise = null; // Clear promise on error to allow retry
      throw error;
    });

  return initPromise;
}

/**
 * Close the database connection
 * 
 * Useful for cleanup or testing. The database will be re-initialized
 * on the next call to getDB(). Also clears the initialization promise
 * to allow fresh initialization.
 */
export function closeDB(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore errors when closing (database might already be closed)
    }
    dbInstance = null;
  }
  // Clear initialization promise to allow fresh initialization
  initPromise = null;
}

/**
 * Check if IndexedDB is available in the current environment
 * 
 * @returns true if IndexedDB is available, false otherwise
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

// Re-export constants (already exported above, but keeping for backward compatibility)
export type { RecruitingDBSchema };

