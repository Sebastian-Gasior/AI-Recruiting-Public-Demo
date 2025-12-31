import { describe, it, expect } from 'vitest'
import {
  extractRoleCluster,
  extractIndustryCluster,
  getAtsScoreBucket,
} from './roleClustering'

describe('roleClustering', () => {
  describe('extractRoleCluster', () => {
    it('should extract "Software Engineer" for software engineering roles', () => {
      expect(extractRoleCluster('Senior Software Engineer')).toBe('Software Engineer')
      expect(extractRoleCluster('Full Stack Developer')).toBe('Software Engineer')
      expect(extractRoleCluster('Backend Entwickler')).toBe('Software Engineer')
    })

    it('should extract "Data Scientist" for data science roles', () => {
      expect(extractRoleCluster('Data Scientist Position')).toBe('Data Scientist')
      expect(extractRoleCluster('Machine Learning Engineer')).toBe('Data Scientist')
      expect(extractRoleCluster('Data Analyst Role')).toBe('Data Scientist')
    })

    it('should extract "Product Manager" for product management roles', () => {
      expect(extractRoleCluster('Product Manager')).toBe('Product Manager')
      expect(extractRoleCluster('Produktmanager gesucht')).toBe('Product Manager')
      expect(extractRoleCluster('Scrum Master Position')).toBe('Product Manager')
    })

    it('should extract "Designer" for design roles', () => {
      expect(extractRoleCluster('UX Designer')).toBe('Designer')
      expect(extractRoleCluster('UI/UX Designer')).toBe('Designer')
      expect(extractRoleCluster('Product Designer')).toBe('Designer')
    })

    it('should return "Other" for unknown roles', () => {
      expect(extractRoleCluster('Marketing Manager')).toBe('Other')
      expect(extractRoleCluster('Sales Representative')).toBe('Other')
      expect(extractRoleCluster('')).toBe('Other')
    })

    it('should be case-insensitive', () => {
      expect(extractRoleCluster('SOFTWARE ENGINEER')).toBe('Software Engineer')
      expect(extractRoleCluster('Data Scientist')).toBe('Data Scientist')
    })
  })

  describe('extractIndustryCluster', () => {
    it('should extract "Technology" for tech companies', () => {
      expect(extractIndustryCluster('Tech company looking for developers')).toBe('Technology')
      expect(extractIndustryCluster('Software company')).toBe('Technology')
      expect(extractIndustryCluster('SaaS startup')).toBe('Technology')
    })

    it('should extract "Finance" for finance companies', () => {
      expect(extractIndustryCluster('Finance company')).toBe('Finance')
      expect(extractIndustryCluster('Banking sector')).toBe('Finance')
      expect(extractIndustryCluster('Fintech startup')).toBe('Finance')
    })

    it('should extract "Healthcare" for healthcare companies', () => {
      expect(extractIndustryCluster('Healthcare company')).toBe('Healthcare')
      expect(extractIndustryCluster('Medical device company')).toBe('Healthcare')
    })

    it('should return "Unknown" for unknown industries', () => {
      expect(extractIndustryCluster('Manufacturing company')).toBe('Unknown')
      expect(extractIndustryCluster('')).toBe('Unknown')
    })

    it('should be case-insensitive', () => {
      expect(extractIndustryCluster('TECH COMPANY')).toBe('Technology')
      expect(extractIndustryCluster('Finance Industry')).toBe('Finance')
    })
  })

  describe('getAtsScoreBucket', () => {
    it('should return "very_low" for scores 0-20', () => {
      expect(getAtsScoreBucket(0)).toBe('very_low')
      expect(getAtsScoreBucket(10)).toBe('very_low')
      expect(getAtsScoreBucket(20)).toBe('very_low')
    })

    it('should return "low" for scores 21-40', () => {
      expect(getAtsScoreBucket(21)).toBe('low')
      expect(getAtsScoreBucket(30)).toBe('low')
      expect(getAtsScoreBucket(40)).toBe('low')
    })

    it('should return "medium" for scores 41-60', () => {
      expect(getAtsScoreBucket(41)).toBe('medium')
      expect(getAtsScoreBucket(50)).toBe('medium')
      expect(getAtsScoreBucket(60)).toBe('medium')
    })

    it('should return "high" for scores 61-80', () => {
      expect(getAtsScoreBucket(61)).toBe('high')
      expect(getAtsScoreBucket(70)).toBe('high')
      expect(getAtsScoreBucket(80)).toBe('high')
    })

    it('should return "very_high" for scores 81-100', () => {
      expect(getAtsScoreBucket(81)).toBe('very_high')
      expect(getAtsScoreBucket(90)).toBe('very_high')
      expect(getAtsScoreBucket(100)).toBe('very_high')
    })

    it('should return "unknown" for invalid scores', () => {
      expect(getAtsScoreBucket(-1)).toBe('unknown')
      expect(getAtsScoreBucket(101)).toBe('unknown')
      expect(getAtsScoreBucket(NaN)).toBe('unknown')
    })
  })
})

