/**
 * Profile Management Modal Component
 * 
 * Provides a modal interface for managing saved profiles:
 * - View list of all saved profiles
 * - Load a profile
 * - Rename a profile
 * - Delete a profile
 * - Delete all local data
 * 
 * Uses shadcn/ui Dialog component for modal functionality.
 * Follows WCAG 2.1 AA accessibility standards.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { list, get, update, delete as deleteProfile, deleteAll } from '@/services/profileService';
import type { Profile } from '@/types/profile.types';

/**
 * Delay in milliseconds before focusing first profile button
 * Ensures modal is fully rendered before focus management
 */
const FOCUS_DELAY_MS = 100;

/**
 * Delay in milliseconds before closing modal after loading profile
 * Allows user to see success message before modal closes
 */
const MODAL_CLOSE_DELAY_MS = 500;

export interface ProfileManagementModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when a profile is loaded */
  onProfileLoad?: (profile: Profile) => void;
}

/**
 * Format date for display
 * 
 * @param dateString - ISO 8601 date string
 * @returns Formatted date string (e.g., "vor 2 Tagen", "15.01.2024")
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Heute';
    } else if (diffDays === 1) {
      return 'Gestern';
    } else if (diffDays < 7) {
      return `vor ${diffDays} Tagen`;
    } else {
      // Format as DD.MM.YYYY
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    }
  } catch {
    return 'Unbekannt';
  }
}

export function ProfileManagementModal({
  open,
  onOpenChange,
  onProfileLoad,
}: ProfileManagementModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Refs for focus management
  const firstProfileRef = useRef<HTMLButtonElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for timeout cleanup
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref for race condition protection (prevents concurrent loadProfiles calls)
  const isLoadingRef = useRef(false);

  /**
   * Load all profiles from IndexedDB
   * Wrapped in useCallback to prevent unnecessary re-renders and fix useEffect dependencies
   * Includes race condition protection: prevents concurrent calls
   */
  const loadProfiles = useCallback(async () => {
    // Race condition protection: prevent concurrent loadProfiles calls
    if (isLoadingRef.current) {
      return; // Already loading, skip this call
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const allProfiles = await list();
      setProfiles(allProfiles);
      setStatusMessage(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der Profile';
      setError(errorMessage);
      setStatusMessage(null);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // Load profiles when modal opens
  useEffect(() => {
    if (open) {
      loadProfiles();
      // Clear status message when opening
      setStatusMessage(null);
      setError(null);
    } else {
      // Reset state when closing
      setRenamingId(null);
      setRenameValue('');
      setDeletingId(null);
      setShowDeleteAllConfirm(false);
    }
  }, [open, loadProfiles]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Focus management: Focus first profile button when modal opens
  useEffect(() => {
    if (open && profiles.length > 0 && firstProfileRef.current) {
      // Small delay to ensure modal is fully rendered
      focusTimeoutRef.current = setTimeout(() => {
        firstProfileRef.current?.focus();
      }, FOCUS_DELAY_MS);
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    };
  }, [open, profiles.length]);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);


  /**
   * Handle loading a profile
   */
  const handleLoadProfile = async (profileId: string) => {
    try {
      const profile = await get(profileId);
      if (profile) {
        setStatusMessage(`Profil "${profile.name}" wurde geladen.`);
        onProfileLoad?.(profile);
        // Close modal after loading
        closeTimeoutRef.current = setTimeout(() => {
          onOpenChange(false);
        }, MODAL_CLOSE_DELAY_MS);
      } else {
        setError('Profil wurde nicht gefunden.');
        await loadProfiles(); // Refresh list
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden des Profils';
      setError(errorMessage);
    }
  };

  /**
   * Start renaming a profile
   */
  const handleStartRename = (profile: Profile) => {
    setRenamingId(profile.id);
    setRenameValue(profile.name);
    setError(null);
  };

  /**
   * Cancel renaming
   */
  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
    setError(null);
  };

  /**
   * Save renamed profile
   */
  const handleSaveRename = async (profileId: string) => {
    const trimmedName = renameValue.trim();
    
    if (!trimmedName) {
      setError('Profilname darf nicht leer sein.');
      return;
    }

    if (trimmedName.length > 100) {
      setError('Profilname darf maximal 100 Zeichen lang sein.');
      return;
    }

    try {
      // Check if profile still exists before updating (error recovery)
      const existingProfile = await get(profileId);
      if (!existingProfile) {
        setError('Profil wurde nicht gefunden. Möglicherweise wurde es gelöscht.');
        setRenamingId(null);
        setRenameValue('');
        await loadProfiles(); // Refresh list
        return;
      }

      await update(profileId, {
        ...existingProfile,
        name: trimmedName,
      });

      setStatusMessage(`Profil wurde umbenannt zu "${trimmedName}".`);
      setRenamingId(null);
      setRenameValue('');
      await loadProfiles(); // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Umbenennen des Profils';
      setError(errorMessage);
      // If update fails, refresh list to ensure consistency
      await loadProfiles();
    }
  };

  /**
   * Handle delete profile confirmation
   */
  const handleDeleteClick = (profileId: string) => {
    setDeletingId(profileId);
    setError(null);
  };

  /**
   * Cancel delete confirmation
   */
  const handleCancelDelete = () => {
    setDeletingId(null);
    setError(null);
  };

  /**
   * Confirm and delete profile
   */
  const handleConfirmDelete = async (profileId: string) => {
    try {
      await deleteProfile(profileId);
      const deletedProfile = profiles.find((p) => p.id === profileId);
      setStatusMessage(`Profil "${deletedProfile?.name || 'Unbekannt'}" wurde gelöscht.`);
      setDeletingId(null);
      await loadProfiles(); // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Löschen des Profils';
      setError(errorMessage);
      setDeletingId(null);
    }
  };

  /**
   * Handle delete all confirmation
   */
  const handleDeleteAllClick = () => {
    setShowDeleteAllConfirm(true);
    setError(null);
  };

  /**
   * Cancel delete all confirmation
   */
  const handleCancelDeleteAll = () => {
    setShowDeleteAllConfirm(false);
    setError(null);
  };

  /**
   * Confirm and delete all profiles
   */
  const handleConfirmDeleteAll = async () => {
    try {
      await deleteAll();
      setStatusMessage('Alle lokalen Daten wurden gelöscht.');
      setShowDeleteAllConfirm(false);
      await loadProfiles(); // Refresh list (should be empty)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Löschen aller Daten';
      setError(errorMessage);
      setShowDeleteAllConfirm(false);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[80vh] flex flex-col"
        aria-labelledby="profile-management-title"
        aria-describedby="profile-management-description"
      >
        <DialogHeader>
          <DialogTitle id="profile-management-title">Profile verwalten</DialogTitle>
          <DialogDescription id="profile-management-description">
            Laden, umbenennen oder löschen Sie gespeicherte Profile.
          </DialogDescription>
        </DialogHeader>

        {/* Status message for screen readers */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {statusMessage}
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md"
          >
            {error}
          </div>
        )}

        {/* Visible status message */}
        {statusMessage && !error && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md"
          >
            {statusMessage}
          </div>
        )}

        {/* Profile list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-600" aria-live="polite">
              Profile werden geladen...
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-8 text-center text-gray-600" aria-live="polite">
              Keine Profile gespeichert.
            </div>
          ) : (
            <div className="space-y-2" role="list" aria-label="Gespeicherte Profile">
              {profiles.map((profile, index) => (
                <Card
                  key={profile.id}
                  className="p-4"
                  role="listitem"
                  aria-label={`Profil: ${profile.name}`}
                >
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {renamingId === profile.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              ref={index === 0 ? renameInputRef : undefined}
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveRename(profile.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelRename();
                                }
                              }}
                              className="flex-1"
                              aria-label="Neuer Profilname"
                              maxLength={100}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveRename(profile.id)}
                              aria-label="Umbenennung speichern"
                            >
                              Speichern
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelRename}
                              aria-label="Umbenennung abbrechen"
                            >
                              Abbrechen
                            </Button>
                          </div>
                        ) : (
                          <>
                            <h3 className="font-semibold text-gray-900 truncate">{profile.name}</h3>
                            <div className="mt-1 text-sm text-gray-600">
                              <div>Erstellt: {formatDate(profile.createdAt)}</div>
                              {profile.updatedAt !== profile.createdAt && (
                                <div>Aktualisiert: {formatDate(profile.updatedAt)}</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {renamingId !== profile.id && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {deletingId === profile.id ? (
                            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                              <span className="text-sm text-red-700">Wirklich löschen?</span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleConfirmDelete(profile.id)}
                                aria-label="Löschen bestätigen"
                              >
                                Ja
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelDelete}
                                aria-label="Löschen abbrechen"
                              >
                                Nein
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                ref={index === 0 ? firstProfileRef : undefined}
                                size="sm"
                                variant="default"
                                onClick={() => handleLoadProfile(profile.id)}
                                onKeyDown={(e) => handleKeyDown(e, () => handleLoadProfile(profile.id))}
                                aria-label={`Profil "${profile.name}" laden`}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Laden
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartRename(profile)}
                                onKeyDown={(e) => handleKeyDown(e, () => handleStartRename(profile))}
                                aria-label={`Profil "${profile.name}" umbenennen`}
                              >
                                Umbenennen
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteClick(profile.id)}
                                onKeyDown={(e) => handleKeyDown(e, () => handleDeleteClick(profile.id))}
                                aria-label={`Profil "${profile.name}" löschen`}
                              >
                                Löschen
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Delete all button */}
        <div className="pt-4 border-t">
          {showDeleteAllConfirm ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700 mb-3">
                Möchten Sie wirklich alle lokalen Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleConfirmDeleteAll}
                  aria-label="Alle Daten löschen bestätigen"
                >
                  Alle löschen
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelDeleteAll}
                  aria-label="Löschen abbrechen"
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="destructive"
              onClick={handleDeleteAllClick}
              onKeyDown={(e) => handleKeyDown(e, handleDeleteAllClick)}
              aria-label="Alle lokalen Daten löschen"
              className="w-full"
              disabled={profiles.length === 0}
            >
              Alle lokalen Daten löschen
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

