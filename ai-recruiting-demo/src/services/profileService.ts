/**
 * Profile Service
 * 
 * Provides CRUD operations for Profile management in IndexedDB.
 * High-level service that uses IndexedDB wrapper for data persistence.
 * 
 * @see src/lib/idb/db.ts for IndexedDB wrapper
 */

import { getDB, STORE_NAME, INDEX_NAMES } from '../lib/idb';
import { ProfileSchema } from '../lib/zod/schemas';
import type { Profile } from '../types/profile.types';

/**
 * Generate UUID using crypto.randomUUID() with fallback for older browsers
 * 
 * @returns UUID string
 */
function generateUUID(): string {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers (RFC4122 version 4 compliant)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validate profile ID format (basic UUID format check)
 * 
 * @param id - Profile ID to validate
 * @throws Error if ID is invalid
 */
function validateProfileId(id: string): void {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error('Profil-ID darf nicht leer sein.');
  }
  // Basic UUID format validation (8-4-4-4-12 hex digits)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error(`Ungültiges Profil-ID-Format: "${id}". Erwartet wird ein UUID-Format.`);
  }
}

/**
 * Validate profile object has required fields
 * 
 * @param profile - Profile object to validate
 * @throws Error if profile is invalid
 */
function validateProfile(profile: Profile): void {
  if (!profile || typeof profile !== 'object') {
    throw new Error('Profil-Daten sind ungültig.');
  }
  if (!profile.name || typeof profile.name !== 'string' || profile.name.trim() === '') {
    throw new Error('Profil-Name darf nicht leer sein.');
  }
  if (!profile.data || typeof profile.data !== 'object') {
    throw new Error('Profil-Daten (data) sind ungültig.');
  }
}

/**
 * Create a new profile in IndexedDB
 * 
 * Generates UUID for profile.id if not provided, sets timestamps,
 * and saves profile to IndexedDB.
 * 
 * @param profile - Profile object to save (id will be generated if not provided)
 * @returns Promise resolving to the profile ID (UUID)
 * @throws Error if IndexedDB operation fails or profile is invalid
 */
export async function create(profile: Profile): Promise<string> {
  try {
    // Validate profile input
    validateProfile(profile);
    
    const db = await getDB();
    
    // Generate UUID if not provided
    const profileId = profile.id || generateUUID();
    
    // Validate generated or provided ID
    validateProfileId(profileId);
    
    // Set timestamps (always set createdAt for new profiles, never use provided value)
    const now = new Date().toISOString();
    const profileToSave: Profile = {
      ...profile,
      id: profileId,
      createdAt: now, // Always set createdAt for new profiles
      updatedAt: now,
    };
    
    // Save to IndexedDB
    await db.put(STORE_NAME, profileToSave);
    
    return profileId;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Profil')) {
      throw error; // Re-throw validation errors as-is
    }
    if (error instanceof DOMException) {
      throw new Error(
        'IndexedDB Fehler: Die Datenbank konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.'
      );
    }
    throw new Error(
      `Fehler beim Speichern des Profils: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    );
  }
}

/**
 * Get a profile by ID from IndexedDB
 * 
 * @param id - Profile ID (UUID)
 * @returns Promise resolving to Profile if found, null if not found
 * @throws Error if IndexedDB operation fails or ID is invalid
 */
export async function get(id: string): Promise<Profile | null> {
  try {
    // Validate ID format
    validateProfileId(id);
    
    const db = await getDB();
    const profile = await db.get(STORE_NAME, id);
    return profile || null;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Profil-ID')) {
      throw error; // Re-throw validation errors as-is
    }
    if (error instanceof DOMException) {
      throw new Error(
        'IndexedDB Fehler: Die Datenbank konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.'
      );
    }
    throw new Error(
      `Fehler beim Laden des Profils: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    );
  }
}

/**
 * List all profiles from IndexedDB
 * 
 * Returns all profiles sorted by creation date (newest first).
 * Uses IndexedDB index for efficient querying.
 * 
 * @returns Promise resolving to array of Profile objects
 * @throws Error if IndexedDB operation fails
 */
export async function list(): Promise<Profile[]> {
  try {
    const db = await getDB();
    
    // Use transaction explicitly and wait for completion
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.store;
    const index = store.index(INDEX_NAMES.BY_CREATED_AT);
    
    // Get all profiles using index (more efficient than getAll)
    const profiles = await index.getAll();
    
    // Wait for transaction to complete
    await transaction.done;
    
    // Sort by createdAt descending (newest first)
    // Note: IndexedDB indexes are sorted ascending by default, so we sort in-memory
    // This is efficient for up to 50 profiles (NFR3 requirement)
    profiles.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order
    });
    
    return profiles;
  } catch (error) {
    if (error instanceof DOMException) {
      throw new Error(
        'IndexedDB Fehler: Die Datenbank konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.'
      );
    }
    throw new Error(
      `Fehler beim Laden der Profile: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    );
  }
}

/**
 * Update an existing profile in IndexedDB
 * 
 * Verifies profile exists, updates updatedAt timestamp,
 * and preserves createdAt timestamp from original profile.
 * Uses transaction to prevent race conditions.
 * 
 * @param id - Profile ID (UUID) to update
 * @param profile - Updated Profile object
 * @returns Promise resolving to void
 * @throws Error if profile not found or IndexedDB operation fails
 */
export async function update(id: string, profile: Profile): Promise<void> {
  try {
    // Validate inputs
    validateProfileId(id);
    validateProfile(profile);
    
    const db = await getDB();
    
    // Use transaction to prevent race conditions between get and put
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.store;
    
    // Verify profile exists and get existing profile (atomic operation within transaction)
    const existingProfile = await store.get(id);
    if (!existingProfile) {
      await transaction.done; // Wait for transaction to complete before throwing
      throw new Error(`Profil mit ID "${id}" wurde nicht gefunden.`);
    }
    
    // Update profile with preserved createdAt and new updatedAt
    const updatedProfile: Profile = {
      ...profile,
      id, // Ensure ID matches
      createdAt: existingProfile.createdAt, // Preserve original createdAt
      updatedAt: new Date().toISOString(), // Update timestamp
    };
    
    // Save updated profile (atomic operation within same transaction)
    await store.put(updatedProfile);
    
    // Wait for transaction to complete
    await transaction.done;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('nicht gefunden') || error.message.includes('Profil'))) {
      throw error; // Re-throw not found and validation errors as-is
    }
    if (error instanceof DOMException) {
      throw new Error(
        'IndexedDB Fehler: Die Datenbank konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.'
      );
    }
    throw new Error(
      `Fehler beim Aktualisieren des Profils: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    );
  }
}

/**
 * Delete a profile from IndexedDB
 * 
 * @param id - Profile ID (UUID) to delete
 * @returns Promise resolving to void
 * @throws Error if IndexedDB operation fails or ID is invalid
 */
export async function deleteProfile(id: string): Promise<void> {
  try {
    // Validate ID format
    validateProfileId(id);
    
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Profil-ID')) {
      throw error; // Re-throw validation errors as-is
    }
    if (error instanceof DOMException) {
      throw new Error(
        'IndexedDB Fehler: Die Datenbank konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.'
      );
    }
    throw new Error(
      `Fehler beim Löschen des Profils: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    );
  }
}

/**
 * Delete a profile from IndexedDB
 * 
 * Alias for deleteProfile() to match Story requirements.
 * Note: Named deleteProfile internally because 'delete' is a reserved word in some contexts.
 * 
 * @param id - Profile ID (UUID) to delete
 * @returns Promise resolving to void
 * @throws Error if IndexedDB operation fails or ID is invalid
 */
export { deleteProfile as delete };

/**
 * Delete all profiles from IndexedDB
 * 
 * Clears all profiles from the profiles store.
 * 
 * @returns Promise resolving to void
 * @throws Error if IndexedDB operation fails
 */
export async function deleteAll(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    if (error instanceof DOMException) {
      throw new Error(
        'IndexedDB Fehler: Die Datenbank konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.'
      );
    }
    throw new Error(
      `Fehler beim Löschen aller Profile: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    );
  }
}

/**
 * Cleanup delay in milliseconds for file download
 * 
 * Ensures download starts before URL is revoked and link is removed.
 * 100ms is typically sufficient for modern browsers to start the download.
 */
const DOWNLOAD_CLEANUP_DELAY_MS = 100;

/**
 * Maximum file size for JSON import in bytes
 * 
 * Limits file size to 10MB to prevent memory issues.
 * This is sufficient for typical profile JSON files.
 */
const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Sanitize profile name for use in filename
 * 
 * Removes invalid filename characters and limits length.
 * 
 * @param name - Profile name to sanitize
 * @returns Sanitized name safe for use in filenames
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename characters with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single underscore
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 50) // Limit length to 50 characters
    || 'profile'; // Fallback if name becomes empty after sanitization
}

/**
 * Generate filename for exported profile
 * 
 * Format: `ai-recruiting-profile-<name>-<date>.json`
 * 
 * @param profile - Profile to generate filename for
 * @returns Filename string
 */
function generateExportFilename(profile: Profile): string {
  const sanitizedName = sanitizeFilename(profile.name);
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  return `ai-recruiting-profile-${sanitizedName}-${date}.json`;
}

/**
 * Export a profile as JSON file
 * 
 * Converts profile to JSON and triggers browser download.
 * Exported JSON contains complete profile data and can be imported back.
 * 
 * Note: Function is async to maintain consistency with other service methods
 * and allow for future async enhancements (e.g., progress callbacks).
 * 
 * @param profile - Profile to export
 * @returns Promise resolving to void
 * @throws Error if export operation fails
 */
export async function exportProfile(profile: Profile): Promise<void> {
  let url: string | null = null;
  let link: HTMLAnchorElement | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    // Validate profile input
    validateProfile(profile);
    
    // Check if browser APIs are available
    if (typeof URL === 'undefined' || typeof document === 'undefined') {
      throw new Error('Browser-APIs für Datei-Downloads sind nicht verfügbar.');
    }
    
    // Check if document.body exists (required for appendChild)
    if (!document.body) {
      throw new Error('Document body ist nicht verfügbar. Bitte warten Sie, bis die Seite vollständig geladen ist.');
    }
    
    // Convert profile to JSON string with pretty formatting
    const jsonString = JSON.stringify(profile, null, 2);
    
    // Verify JSON is valid by parsing it back
    try {
      JSON.parse(jsonString);
    } catch (parseError) {
      throw new Error('Fehler beim Erstellen der JSON-Datei: Ungültiges Format.');
    }
    
    // Create Blob from JSON string
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Generate filename
    const filename = generateExportFilename(profile);
    
    // Create download URL
    url = URL.createObjectURL(blob);
    
    // Create temporary link element
    link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none'; // Hide link element
    
    // Append to body, trigger click, then schedule cleanup
    document.body.appendChild(link);
    link.click();
    
    // Cleanup: Remove link and revoke URL after delay
    // Use setTimeout to ensure download starts before cleanup
    timeoutId = setTimeout(() => {
      try {
        if (link && document.body.contains(link)) {
          document.body.removeChild(link);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors (link might already be removed)
      }
      
      try {
        if (url) {
          URL.revokeObjectURL(url);
        }
      } catch (revokeError) {
        // Ignore revoke errors (URL might already be revoked)
      }
      
      // Clear references
      link = null;
      url = null;
      timeoutId = null;
    }, DOWNLOAD_CLEANUP_DELAY_MS);
  } catch (error) {
    // Cleanup on error: clear timeout, remove link, revoke URL
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    if (link !== null) {
      try {
        if (document.body && document.body.contains(link)) {
          document.body.removeChild(link);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      link = null;
    }
    
    if (url !== null) {
      try {
        URL.revokeObjectURL(url);
      } catch (revokeError) {
        // Ignore revoke errors
      }
      url = null;
    }
    
    // Re-throw error with appropriate message
    if (error instanceof Error && error.message.includes('Profil')) {
      throw error; // Re-throw validation errors as-is
    }
    if (error instanceof Error && (error.message.includes('Browser-APIs') || error.message.includes('Document body'))) {
      throw error; // Re-throw browser API errors as-is
    }
    throw new Error(
      `Fehler beim Exportieren des Profils: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    );
  }
}

/**
 * Export a profile as JSON file
 * 
 * Alias for exportProfile() to match Story requirements.
 * Note: Named exportProfile internally because 'export' is a reserved word in JavaScript/TypeScript.
 * 
 * @param profile - Profile to export
 * @returns Promise resolving to void
 * @throws Error if export operation fails
 */
export { exportProfile as export };

/**
 * Read file content as text using FileReader API
 * 
 * @param file - File object to read
 * @returns Promise resolving to file content as string
 * @throws Error if file reading fails
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if FileReader is available
    if (typeof FileReader === 'undefined') {
      reject(new Error('FileReader API ist nicht verfügbar. Bitte verwenden Sie einen modernen Browser.'));
      return;
    }

    const reader = new FileReader();
    let isResolved = false;

    const cleanup = () => {
      // Abort reader if still reading
      try {
        if (reader.readyState === FileReader.LOADING) {
          reader.abort();
        }
      } catch {
        // Ignore abort errors (reader might already be done)
      }
    };

    reader.onload = () => {
      if (isResolved) return; // Prevent multiple resolutions
      isResolved = true;

      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        cleanup();
        reject(new Error('Fehler beim Lesen der Datei: Ungültiges Format.'));
      }
    };

    reader.onerror = () => {
      if (isResolved) return; // Prevent multiple rejections
      isResolved = true;
      cleanup();
      reject(new Error('Fehler beim Lesen der Datei. Bitte versuchen Sie es erneut.'));
    };

    reader.onabort = () => {
      if (isResolved) return; // Prevent multiple rejections
      isResolved = true;
      reject(new Error('Datei-Lesen wurde abgebrochen.'));
    };

    // Start reading file as text
    try {
      reader.readAsText(file);
    } catch (error) {
      cleanup();
      reject(new Error('Fehler beim Starten des Datei-Lesens. Bitte versuchen Sie es erneut.'));
    }
  });
}

/**
 * Format Zod validation errors into user-friendly German messages
 * 
 * @param errors - Zod error array
 * @returns Formatted error message string
 */
function formatZodErrors(errors: Array<{ path: (string | number)[]; message: string }>): string {
  if (errors.length === 0) {
    return 'Validierungsfehler: Unbekannter Fehler.';
  }

  const formattedErrors = errors.map((error) => {
    const fieldPath = error.path.length > 0 ? error.path.join('.') : 'Stammobjekt';
    return `${fieldPath}: ${error.message}`;
  });

  return `Validierungsfehler:\n${formattedErrors.join('\n')}`;
}

/**
 * Import a profile from JSON file
 * 
 * Reads JSON file, validates schema using Zod, and creates a new profile entry.
 * The imported profile gets a new UUID and updated timestamps.
 * 
 * @param file - JSON file to import
 * @returns Promise resolving to the imported Profile
 * @throws Error if file reading, JSON parsing, validation, or profile creation fails
 */
export async function importProfile(file: File): Promise<Profile> {
  try {
    // Validate file input
    if (!file || !(file instanceof File)) {
      throw new Error('Ungültige Datei. Bitte wählen Sie eine gültige JSON-Datei aus.');
    }

    // Check if file name is empty
    if (!file.name || file.name.trim() === '') {
      throw new Error('Dateiname ist leer. Bitte wählen Sie eine gültige JSON-Datei aus.');
    }

    // Check file type (basic check - should be JSON)
    if (!file.name.toLowerCase().endsWith('.json')) {
      throw new Error('Ungültiger Dateityp. Bitte wählen Sie eine JSON-Datei (.json) aus.');
    }

    // Check if file is empty
    if (file.size === 0) {
      throw new Error('Die Datei ist leer. Bitte wählen Sie eine Datei mit Inhalt aus.');
    }

    // Check file size (limit to prevent memory issues)
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      throw new Error(
        `Datei ist zu groß (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximale Größe: ${(MAX_IMPORT_FILE_SIZE / 1024 / 1024).toFixed(0)} MB.`
      );
    }

    // Read file as text
    let fileContent: string;
    try {
      fileContent = await readFileAsText(file);
    } catch (readError) {
      if (readError instanceof Error) {
        throw readError; // Re-throw file reading errors as-is
      }
      throw new Error('Fehler beim Lesen der Datei. Bitte versuchen Sie es erneut.');
    }

    // Check if file content is empty after trimming
    const trimmedContent = fileContent.trim();
    if (trimmedContent === '') {
      throw new Error('Die JSON-Datei ist leer. Bitte wählen Sie eine Datei mit Inhalt aus.');
    }

    // Parse JSON
    let jsonData: unknown;
    try {
      jsonData = JSON.parse(trimmedContent);
    } catch (parseError) {
      throw new Error('Die JSON-Datei ist ungültig oder beschädigt. Bitte überprüfen Sie die Datei.');
    }

    // Validate schema using Zod
    const validationResult = ProfileSchema.safeParse(jsonData);
    if (!validationResult.success) {
      const errorMessage = formatZodErrors(validationResult.error.errors);
      throw new Error(errorMessage);
    }

    // Create new profile with new UUID and updated timestamps
    const now = new Date().toISOString();
    const importedProfile: Profile = {
      ...validationResult.data,
      id: generateUUID(), // Generate new UUID (overwrite existing id from import)
      createdAt: now, // Update timestamp to current time
      updatedAt: now, // Update timestamp to current time
    };

    // Save using Profile Service create() method
    // This ensures the profile is validated and saved correctly
    await create(importedProfile);

    return importedProfile;
  } catch (error) {
    // Re-throw validation and file reading errors as-is (they already have user-friendly messages)
    if (error instanceof Error && (
      error.message.includes('Validierungsfehler') ||
      error.message.includes('JSON-Datei') ||
      error.message.includes('Datei') ||
      error.message.includes('FileReader') ||
      error.message.includes('Ungültige Datei') ||
      error.message.includes('zu groß')
    )) {
      throw error;
    }

    // Re-throw profile creation errors as-is (from create() method)
    if (error instanceof Error && error.message.includes('Profil')) {
      throw error;
    }

    // Wrap other errors
    throw new Error(
      `Fehler beim Importieren des Profils: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    );
  }
}

/**
 * Import a profile from JSON file
 * 
 * Alias for importProfile() to match Story requirements.
 * Note: Named importProfile internally because 'import' is a reserved word in JavaScript/TypeScript.
 * 
 * @param file - JSON file to import
 * @returns Promise resolving to the imported Profile
 * @throws Error if import operation fails
 */
export { importProfile as import };
