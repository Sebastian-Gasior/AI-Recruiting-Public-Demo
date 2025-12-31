/**
 * Zod schemas for Profile data validation
 * 
 * Provides runtime validation for Profile, ExperienceItem, and EducationItem types.
 * Used for JSON import/export validation (Story 4.5).
 * 
 * @see src/types/profile.types.ts for TypeScript type definitions
 */

import { z } from 'zod';

/**
 * Regular expression for MM/YYYY date format validation
 * Matches: 01/2024, 12/2023, etc.
 */
const MM_YYYY_REGEX = /^(0[1-9]|1[0-2])\/\d{4}$/;

/**
 * Helper function to transform empty strings to undefined for optional fields
 * 
 * @param value - String value to transform
 * @returns Original value if non-empty, undefined if empty string
 */
function emptyStringToUndefined(value: string | undefined): string | undefined {
  return value === '' ? undefined : value;
}

/**
 * Zod schema for ExperienceItem validation
 * 
 * Validates work experience entries with employer, role, dates, and description.
 * Validates that startDate <= endDate (when endDate is not 'current').
 */
export const ExperienceItemSchema = z
  .object({
    employer: z
      .string({
        required_error: 'Arbeitgeber ist erforderlich',
        invalid_type_error: 'Arbeitgeber muss ein Text sein',
      })
      .trim()
      .min(1, 'Arbeitgeber darf nicht leer sein'),
    
    role: z
      .string({
        required_error: 'Rolle ist erforderlich',
        invalid_type_error: 'Rolle muss ein Text sein',
      })
      .trim()
      .min(1, 'Rolle darf nicht leer sein'),
    
    startDate: z
      .string({
        required_error: 'Startdatum ist erforderlich',
        invalid_type_error: 'Startdatum muss ein Text sein',
      })
      .trim()
      .regex(MM_YYYY_REGEX, 'Startdatum muss im Format MM/YYYY sein (z.B. 01/2024)'),
    
    endDate: z.union([
      z.literal('current', {
        errorMap: () => ({ message: 'Enddatum muss "current" oder im Format MM/YYYY sein' }),
      }),
      z
        .string({
          required_error: 'Enddatum ist erforderlich',
          invalid_type_error: 'Enddatum muss ein Text sein',
        })
        .trim()
        .regex(MM_YYYY_REGEX, 'Enddatum muss im Format MM/YYYY sein (z.B. 12/2023)'),
    ]),
    
    description: z
      .string({
        required_error: 'Beschreibung ist erforderlich',
        invalid_type_error: 'Beschreibung muss ein Text sein',
      })
      .trim()
      .min(1, 'Beschreibung darf nicht leer sein'),
  })
  .refine(
    (data) => {
      // If endDate is 'current', no date comparison needed
      if (data.endDate === 'current') {
        return true;
      }
      
      // Parse dates for comparison (MM/YYYY format)
      const [startMonth, startYear] = data.startDate.split('/').map(Number);
      const [endMonth, endYear] = data.endDate.split('/').map(Number);
      
      // Compare: startDate should be <= endDate
      if (startYear < endYear) {
        return true;
      }
      if (startYear === endYear && startMonth <= endMonth) {
        return true;
      }
      
      return false;
    },
    {
      message: 'Startdatum muss vor oder gleich dem Enddatum sein',
    }
  );

/**
 * Zod schema for EducationItem validation
 * 
 * Validates education entries with optional degree, institution, dates, and notes.
 * Transforms empty strings to undefined for optional fields.
 */
export const EducationItemSchema = z.object({
  degree: z
    .string({
      invalid_type_error: 'Abschluss muss ein Text sein',
    })
    .trim()
    .transform(emptyStringToUndefined)
    .optional(),
  
  institution: z
    .string({
      invalid_type_error: 'Institution muss ein Text sein',
    })
    .trim()
    .transform(emptyStringToUndefined)
    .optional(),
  
  startDate: z
    .string({
      invalid_type_error: 'Startdatum muss ein Text sein',
    })
    .trim()
    .regex(MM_YYYY_REGEX, 'Startdatum muss im Format MM/YYYY sein (z.B. 09/2020)')
    .transform(emptyStringToUndefined)
    .optional(),
  
  endDate: z
    .string({
      invalid_type_error: 'Enddatum muss ein Text sein',
    })
    .trim()
    .regex(MM_YYYY_REGEX, 'Enddatum muss im Format MM/YYYY sein (z.B. 06/2024)')
    .transform(emptyStringToUndefined)
    .optional(),
  
  notes: z
    .string({
      invalid_type_error: 'Notizen müssen ein Text sein',
    })
    .trim()
    .transform(emptyStringToUndefined)
    .optional(),
}).refine(
  (data) => {
    // If both dates are present, validate that startDate <= endDate
    if (data.startDate && data.endDate) {
      const [startMonth, startYear] = data.startDate.split('/').map(Number);
      const [endMonth, endYear] = data.endDate.split('/').map(Number);
      
      if (startYear < endYear) {
        return true;
      }
      if (startYear === endYear && startMonth <= endMonth) {
        return true;
      }
      
      return false;
    }
    return true;
  },
  {
    message: 'Startdatum muss vor oder gleich dem Enddatum sein',
    path: ['endDate'], // Error path for better UX
  }
);

/**
 * Zod schema for Profile data validation
 * 
 * Validates the complete Profile structure including nested data object.
 */
export const ProfileSchema = z.object({
  id: z
    .string({
      required_error: 'Profil-ID ist erforderlich',
      invalid_type_error: 'Profil-ID muss ein Text sein',
    })
    .trim()
    .uuid('Profil-ID muss ein gültiges UUID-Format haben (z.B. 123e4567-e89b-12d3-a456-426614174000)'),
  
  name: z
    .string({
      required_error: 'Profilname ist erforderlich',
      invalid_type_error: 'Profilname muss ein Text sein',
    })
    .trim()
    .min(1, 'Profilname darf nicht leer sein'),
  
  createdAt: z
    .string({
      required_error: 'Erstellungsdatum ist erforderlich',
      invalid_type_error: 'Erstellungsdatum muss ein Text sein',
    })
    .trim()
    .datetime({
      message: 'Erstellungsdatum muss im ISO 8601 Format sein (z.B. 2024-01-15T10:30:00.000Z)',
    }),
  
  updatedAt: z
    .string({
      required_error: 'Aktualisierungsdatum ist erforderlich',
      invalid_type_error: 'Aktualisierungsdatum muss ein Text sein',
    })
    .trim()
    .datetime({
      message: 'Aktualisierungsdatum muss im ISO 8601 Format sein (z.B. 2024-01-15T10:30:00.000Z)',
    }),
  
  data: z.object({
    profileSummary: z
      .string({
        invalid_type_error: 'Profil-Zusammenfassung muss ein Text sein',
      })
      .trim()
      .transform(emptyStringToUndefined)
      .optional(),
    
    experiences: z.array(ExperienceItemSchema, {
      required_error: 'Berufserfahrungen sind erforderlich',
      invalid_type_error: 'Berufserfahrungen müssen ein Array sein',
    }),
    
    education: z.array(EducationItemSchema, {
      required_error: 'Bildung ist erforderlich',
      invalid_type_error: 'Bildung muss ein Array sein',
    }),
    
    skills: z
      .string({
        required_error: 'Fähigkeiten sind erforderlich',
        invalid_type_error: 'Fähigkeiten müssen ein Text sein',
      })
      .trim()
      .min(1, 'Fähigkeiten dürfen nicht leer sein'),
    
    projects: z
      .string({
        invalid_type_error: 'Projekte müssen ein Text sein',
      })
      .trim()
      .transform(emptyStringToUndefined)
      .optional(),
  }),
});

/**
 * TypeScript type inference from Zod schemas
 * 
 * These types are inferred from the Zod schemas and should match
 * the TypeScript interfaces defined in types/profile.types.ts.
 * 
 * Note: The inferred types may have slight differences (e.g., optional fields
 * transformed from empty strings to undefined), but they are compatible
 * with the original TypeScript interfaces.
 * 
 * @see src/types/profile.types.ts for the original TypeScript interfaces
 */
export type ExperienceItemFromSchema = z.infer<typeof ExperienceItemSchema>;
export type EducationItemFromSchema = z.infer<typeof EducationItemSchema>;
export type ProfileFromSchema = z.infer<typeof ProfileSchema>;
