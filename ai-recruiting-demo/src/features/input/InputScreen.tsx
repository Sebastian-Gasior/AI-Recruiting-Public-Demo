import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ExperienceItem, EducationItem, Profile } from '@/types/profile.types'
import { useProfile } from '@/contexts/ProfileContext'
import { useAnalysis } from '@/contexts/AnalysisContext'
import { PrivacyNotice } from '@/components/shared/PrivacyNotice'
import { ExperienceCard } from '@/components/forms/ExperienceCard'
import { EducationCard } from '@/components/forms/EducationCard'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Plus, AlertCircle, CheckCircle2, Save, Upload, Download, FileUp } from 'lucide-react'
import { validateProfileData, type ValidationResult } from '@/utils/validation'
import { create, get, export as exportProfile, import as importProfile } from '@/services/profileService'
import { ProfileManagementModal } from '@/features/profile/ProfileManagementModal'

/**
 * Delay in milliseconds before auto-hiding feedback messages
 * 
 * Provides enough time for users to read success/error messages
 * before they automatically disappear.
 */
const FEEDBACK_AUTO_HIDE_DELAY_MS = 5000

export default function InputScreen() {
  const navigate = useNavigate()
  const { updateProfile, updateJobPostingText } = useProfile()
  const { clearAnalysisResult } = useAnalysis()

  // Privacy Notice State
  const [privacyAccepted, setPrivacyAccepted] = useState<boolean>(false)

  // Profile State (local state for form inputs)
  const [profileSummary, setProfileSummary] = useState<string>('')
  const [experiences, setExperiences] = useState<ExperienceItem[]>([])
  const [education, setEducation] = useState<EducationItem[]>([])
  const [skills, setSkills] = useState<string>('')
  const [projects, setProjects] = useState<string>('')

  // Job Posting State (local state for form input)
  const [jobPosting, setJobPosting] = useState<string>('')

  // Validation State
  const [validationResults, setValidationResults] = useState<ValidationResult>({
    valid: true,
    errors: [],
  })

  // Profile Management State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [saveProfileName, setSaveProfileName] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Create Profile object from state for validation
  const profile: Profile = useMemo(
    () => ({
      id: '', // Will be generated when saving
      name: '', // Will be set when saving
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        profileSummary: profileSummary || undefined,
        experiences,
        education,
        skills,
        projects: projects || undefined,
      },
    }),
    [profileSummary, experiences, education, skills, projects]
  )

  // Real-time validation
  useEffect(() => {
    const result = validateProfileData(profile, jobPosting)
    setValidationResults(result)
  }, [profile, jobPosting])

  // Sync local state to ProfileContext when form data changes
  useEffect(() => {
    // Update profile in context whenever local profile state changes
    updateProfile(profile)
  }, [profile, updateProfile])

  // Sync job posting to ProfileContext when it changes
  useEffect(() => {
    updateJobPostingText(jobPosting)
  }, [jobPosting, updateJobPostingText])

  // Experience Card Handlers
  const addExperience = () => {
    setExperiences([
      ...experiences,
      {
        employer: '',
        role: '',
        startDate: '',
        endDate: 'current',
        description: '',
      },
    ])
  }

  const removeExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index))
  }

  const updateExperience = (index: number, experience: ExperienceItem) => {
    setExperiences(experiences.map((exp, i) => (i === index ? experience : exp)))
  }

  // Education Card Handlers
  const addEducation = () => {
    setEducation([
      ...education,
      {
        degree: '',
        institution: '',
        startDate: '',
        endDate: '',
        notes: '',
      },
    ])
  }

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index))
  }

  const updateEducation = (index: number, educationItem: EducationItem) => {
    setEducation(education.map((edu, i) => (i === index ? educationItem : edu)))
  }

  /**
   * Handle Start Analysis button click.
   * 
   * This function:
   * 1. Clears previous analysis results (state cleanup)
   * 2. Creates a Profile object from Input Screen state
   * 3. Validates that profile and job posting are present
   * 4. Navigates to `/analysis` route (Loading Screen) with profile and jobPostingText in location state
   * 5. Loading Screen will then call runAnalysis and display stepper messages
   * 
   * **Privacy-First:**
   * - All data is passed via React Router location.state (in-memory only)
   * - No network requests are made
   * - All analysis runs locally in browser (FR41, FR42, FR43)
   * 
   * **Performance:**
   * - Analysis will use caching (FR28) to avoid recomputation
   * - Analysis completes in < 2s for typical profile/job combination (NFR2)
   * 
   * **State Management:**
   * - Clears previous analysis results when starting new analysis
   * 
   * @throws Shows error feedback if job posting is missing
   */
  const handleStartAnalysis = () => {
    // Clear previous analysis results (state cleanup)
    clearAnalysisResult()

    // Validate that validation passed
    if (!validationResults.valid) {
      showFeedback('error', 'Bitte beheben Sie die Validierungsfehler, um die Analyse zu starten.')
      return
    }

    // Validate job posting is present
    if (!jobPosting || jobPosting.trim().length === 0) {
      showFeedback('error', 'Bitte geben Sie eine Stellenausschreibung ein.')
      return
    }

    // Validate skills is present (required field)
    if (!skills || skills.trim().length === 0) {
      showFeedback('error', 'Bitte geben Sie Ihre Skills ein.')
      return
    }

    // Use existing profile useMemo instead of creating duplicate object
    // Only override id and name fields (not needed for analysis)
    const profileForAnalysis: Profile = {
      ...profile,
      id: '', // Not needed for analysis
      name: '', // Not needed for analysis
    }

    // Navigate to Loading Screen with profile and jobPostingText in location state
    // Loading Screen will receive this data and call runAnalysis
    // Privacy-First: Data passed via location.state (in-memory only, no network requests)
    navigate('/analysis', {
      state: {
        profile: profileForAnalysis,
        jobPostingText: jobPosting.trim(),
      },
    })
  }

  /**
   * Populate form fields from Profile object
   */
  const populateFormFromProfile = (profile: Profile) => {
    setProfileSummary(profile.data.profileSummary || '')
    setExperiences(profile.data.experiences || [])
    setEducation(profile.data.education || [])
    setSkills(profile.data.skills || '')
    setProjects(profile.data.projects || '')
  }

  /**
   * Show feedback message
   */
  const showFeedback = (type: 'success' | 'error', message: string) => {
    // Clear existing timeout if any
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = null
    }

    setFeedbackMessage({ type, message })
    // Auto-hide after delay
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackMessage(null)
      feedbackTimeoutRef.current = null
    }, FEEDBACK_AUTO_HIDE_DELAY_MS)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
        feedbackTimeoutRef.current = null
      }
    }
  }, [])

  /**
   * Handle Save Profile button click
   */
  const handleSaveProfileClick = () => {
    setSaveProfileName('')
    setIsSaveDialogOpen(true)
  }

  /**
   * Handle Save Dialog open/close state change
   */
  const handleSaveDialogChange = (open: boolean) => {
    setIsSaveDialogOpen(open)
    // Reset profile name when dialog closes
    if (!open) {
      setSaveProfileName('')
    }
  }

  /**
   * Handle Save Profile confirmation
   */
  const handleSaveProfile = async () => {
    const trimmedName = saveProfileName.trim()
    
    if (!trimmedName) {
      showFeedback('error', 'Profilname darf nicht leer sein.')
      return
    }

    if (trimmedName.length > 100) {
      showFeedback('error', 'Profilname darf maximal 100 Zeichen lang sein.')
      return
    }

    try {
      const profileToSave: Profile = {
        id: '', // Will be generated by create()
        name: trimmedName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: {
          profileSummary: profileSummary || undefined,
          experiences,
          education,
          skills,
          projects: projects || undefined,
        },
      }

      await create(profileToSave)
      setIsSaveDialogOpen(false)
      setSaveProfileName('')
      showFeedback('success', `Profil "${trimmedName}" wurde erfolgreich gespeichert.`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Speichern des Profils'
      showFeedback('error', errorMessage)
    }
  }

  /**
   * Handle Load Profile button click
   */
  const handleLoadProfileClick = () => {
    setIsProfileModalOpen(true)
  }

  /**
   * Handle profile loaded from Profile Management Modal
   */
  const handleProfileLoad = async (profile: Profile) => {
    try {
      populateFormFromProfile(profile)
      setIsProfileModalOpen(false)
      showFeedback('success', `Profil "${profile.name}" wurde erfolgreich geladen.`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden des Profils'
      showFeedback('error', errorMessage)
    }
  }

  /**
   * Handle Export Profile JSON button click
   * 
   * Note: Exports current form data as-is, even if incomplete or invalid.
   * This allows users to export work-in-progress profiles for backup or sharing.
   */
  const handleExportProfile = async () => {
    try {
      const profileToExport: Profile = {
        id: '', // Not needed for export
        name: 'Exported Profile',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: {
          profileSummary: profileSummary || undefined,
          experiences,
          education,
          skills,
          projects: projects || undefined,
        },
      }

      await exportProfile(profileToExport)
      showFeedback('success', 'Profil wurde erfolgreich als JSON-Datei exportiert.')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Exportieren des Profils'
      showFeedback('error', errorMessage)
    }
  }

  /**
   * Handle Import Profile JSON button click
   */
  const handleImportProfileClick = () => {
    fileInputRef.current?.click()
  }

  /**
   * Handle file selection for import
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const importedProfile = await importProfile(file)
      populateFormFromProfile(importedProfile)
      showFeedback('success', `Profil "${importedProfile.name}" wurde erfolgreich importiert.`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Importieren des Profils'
      showFeedback('error', errorMessage)
    } finally {
      // Reset file input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <main
      className="container mx-auto max-w-4xl px-4 py-8"
      role="main"
      aria-label="Profile Input Form"
      lang="de"
    >
      <div className="space-y-8">
        {/* Privacy Notice Section */}
        <section aria-labelledby="privacy-heading">
          <PrivacyNotice
            variant="input"
            showCheckbox={true}
            checkboxChecked={privacyAccepted}
            onCheckboxChange={setPrivacyAccepted}
          />
        </section>

        {/* Validation Guidance (Non-blocking) */}
        {!validationResults.valid && validationResults.errors.length > 0 && (
          <Alert variant="destructive" role="alert" aria-live="polite">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationResults.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Summary Section */}
        <section aria-labelledby="profile-summary-heading" className="space-y-2">
          <label
            id="profile-summary-heading"
            htmlFor="profile-summary"
            className="text-base font-medium text-gray-900"
          >
            Profile Summary (optional)
          </label>
          <Textarea
            id="profile-summary"
            value={profileSummary}
            onChange={(e) => setProfileSummary(e.target.value)}
            placeholder="Beschreiben Sie sich kurz..."
            rows={4}
            className="w-full"
            aria-describedby="profile-summary-hint"
          />
          <p id="profile-summary-hint" className="text-sm text-gray-500">
            Optional: Kurze Zusammenfassung Ihrer beruflichen Erfahrung
          </p>
        </section>

        {/* Work Experience Cards Section */}
        <section aria-labelledby="experience-heading" className="space-y-4">
          <h2 id="experience-heading" className="text-xl font-semibold text-gray-900">
            Arbeitserfahrung
          </h2>
          {experiences.length === 0 && (
            <p className="text-sm text-gray-500" role="status">
              Noch keine Arbeitserfahrung hinzugefügt
            </p>
          )}
          <div className="space-y-4" role="list" aria-label="Work Experience Entries">
            {experiences.map((experience, index) => (
              <div key={index} role="listitem">
                <ExperienceCard
                  experience={experience}
                  onChange={(exp) => updateExperience(index, exp)}
                  onRemove={() => removeExperience(index)}
                  index={index}
                />
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addExperience}
            className="w-full sm:w-auto"
            aria-label="Add Work Experience Entry"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Arbeitserfahrung hinzufügen
          </Button>
        </section>

        {/* Education Cards Section */}
        <section aria-labelledby="education-heading" className="space-y-4">
          <h2 id="education-heading" className="text-xl font-semibold text-gray-900">
            Ausbildung
          </h2>
          {education.length === 0 && (
            <p className="text-sm text-gray-500" role="status">
              Noch keine Ausbildung hinzugefügt
            </p>
          )}
          <div className="space-y-4" role="list" aria-label="Education Entries">
            {education.map((educationItem, index) => (
              <div key={index} role="listitem">
                <EducationCard
                  education={educationItem}
                  onChange={(edu) => updateEducation(index, edu)}
                  onRemove={() => removeEducation(index)}
                  index={index}
                />
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addEducation}
            className="w-full sm:w-auto"
            aria-label="Add Education Entry"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Ausbildung hinzufügen
          </Button>
        </section>

        {/* Skills Section */}
        <section aria-labelledby="skills-heading" className="space-y-2">
          <label
            id="skills-heading"
            htmlFor="skills"
            className="text-base font-medium text-gray-900"
          >
            Skills <span className="text-red-600" aria-label="required">*</span>
          </label>
          <Textarea
            id="skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="z.B. JavaScript, React, TypeScript, Python..."
            rows={4}
            aria-required="true"
            className="w-full"
            aria-describedby="skills-hint"
          />
          <p id="skills-hint" className="text-sm text-gray-500">
            Bitte listen Sie Ihre Fähigkeiten und Kompetenzen auf
          </p>
        </section>

        {/* Projects/Responsibilities Section (Collapsible) */}
        <section aria-labelledby="projects-heading">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="projects">
              <AccordionTrigger
                id="projects-heading"
                className="text-base font-medium text-gray-900"
              >
                Projects/Responsibilities (optional)
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                <label htmlFor="projects" className="sr-only">
                  Projects/Responsibilities
                </label>
                <Textarea
                  id="projects"
                  value={projects}
                  onChange={(e) => setProjects(e.target.value)}
                  placeholder="Beschreiben Sie relevante Projekte oder Verantwortlichkeiten..."
                  rows={6}
                  className="w-full"
                  aria-describedby="projects-hint"
                />
                <p id="projects-hint" className="text-sm text-gray-500">
                  Optional: Zusätzliche Informationen zu Projekten oder besonderen
                  Verantwortlichkeiten
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Job Posting Section */}
        <section aria-labelledby="job-posting-heading" className="space-y-2">
          <label
            id="job-posting-heading"
            htmlFor="job-posting"
            className="text-base font-medium text-gray-900"
          >
            Job Posting <span className="text-red-600" aria-label="required">*</span>
          </label>
          <Textarea
            id="job-posting"
            value={jobPosting}
            onChange={(e) => setJobPosting(e.target.value)}
            placeholder="Fügen Sie hier die vollständige Stellenausschreibung ein..."
            rows={8}
            aria-required="true"
            className="w-full"
            aria-describedby="job-posting-hint"
          />
          <p id="job-posting-hint" className="text-sm text-gray-500">
            Bitte fügen Sie die vollständige Stellenausschreibung ein, die analysiert werden soll
          </p>
        </section>

        {/* Profile Management Actions Bar */}
        <section aria-labelledby="profile-actions-heading" className="pt-4 border-t">
          <h2 id="profile-actions-heading" className="sr-only">
            Profil-Verwaltung
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="default"
              onClick={handleSaveProfileClick}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              aria-label="Profil speichern"
            >
              <Save className="h-4 w-4 mr-2" aria-hidden="true" />
              Profil speichern
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleLoadProfileClick}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              aria-label="Profil laden"
            >
              <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
              Profil laden
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleExportProfile}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              aria-label="Profil als JSON exportieren"
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Profil exportieren
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleImportProfileClick}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              aria-label="Profil aus JSON importieren"
            >
              <FileUp className="h-4 w-4 mr-2" aria-hidden="true" />
              Profil importieren
            </Button>
          </div>
          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Profil JSON-Datei auswählen"
          />
        </section>

        {/* User Feedback Messages */}
        {feedbackMessage && (
          <Alert
            variant={feedbackMessage.type === 'error' ? 'destructive' : 'default'}
            role={feedbackMessage.type === 'error' ? 'alert' : 'status'}
            aria-live={feedbackMessage.type === 'error' ? 'assertive' : 'polite'}
            className={
              feedbackMessage.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : ''
            }
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{feedbackMessage.message}</AlertDescription>
          </Alert>
        )}

        {/* Start Analysis Button */}
        <section aria-labelledby="start-analysis-heading" className="pt-4">
          <Button
            type="button"
            onClick={handleStartAnalysis}
            disabled={!validationResults.valid}
            className="w-full sm:w-auto min-w-[200px]"
            aria-label={
              validationResults.valid
                ? 'Analyse starten'
                : 'Analyse starten (deaktiviert: Bitte beheben Sie die Validierungsfehler)'
            }
            aria-disabled={!validationResults.valid}
          >
            Analyse starten
          </Button>
          {!validationResults.valid && (
            <p className="mt-2 text-sm text-gray-500" role="status">
              Bitte beheben Sie die Validierungsfehler, um die Analyse zu starten.
            </p>
          )}
        </section>
      </div>

      {/* Save Profile Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={handleSaveDialogChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Profil speichern</DialogTitle>
            <DialogDescription>
              Geben Sie einen Namen für dieses Profil ein. Sie können es später laden, umbenennen oder löschen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="profile-name" className="text-sm font-medium">
                Profilname
              </label>
              <Input
                id="profile-name"
                value={saveProfileName}
                onChange={(e) => setSaveProfileName(e.target.value)}
                placeholder="z.B. Software Engineer Position"
                maxLength={100}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveProfile()
                  } else if (e.key === 'Escape') {
                    setIsSaveDialogOpen(false)
                  }
                }}
                aria-label="Profilname eingeben"
                aria-required="true"
              />
              <p className="text-xs text-gray-500">
                {saveProfileName.length}/100 Zeichen
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
              aria-label="Abbrechen"
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={!saveProfileName.trim()}
              aria-label="Profil speichern"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Management Modal */}
      <ProfileManagementModal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        onProfileLoad={handleProfileLoad}
      />
    </main>
  )
}
