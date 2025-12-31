import { describe, it, expect } from 'vitest';
import { createHash, createAnalysisHash } from './hash';

describe('createHash', () => {
  it('should create deterministic hash (same input = same hash)', () => {
    const input = 'test input';
    const hash1 = createHash(input);
    const hash2 = createHash(input);
    const hash3 = createHash(input);

    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('should create different hashes for different inputs', () => {
    const hash1 = createHash('input 1');
    const hash2 = createHash('input 2');
    const hash3 = createHash('input 3');

    expect(hash1).not.toBe(hash2);
    expect(hash2).not.toBe(hash3);
    expect(hash1).not.toBe(hash3);
  });

  it('should handle empty input', () => {
    const hash = createHash('');
    expect(hash).toBe('0');
  });

  it('should handle large input', () => {
    const largeInput = 'a'.repeat(10000);
    const hash = createHash(largeInput);
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
  });

  it('should handle special characters', () => {
    const specialInput = 'test@#$%^&*()_+-=[]{}|;:,.<>?';
    const hash = createHash(specialInput);
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
  });

  it('should handle Unicode characters', () => {
    const unicodeInput = 'test äöü ß 中文 🚀';
    const hash = createHash(unicodeInput);
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
  });
});

describe('createAnalysisHash', () => {
  it('should create deterministic hash from profile data and job posting', () => {
    const profileData = { skills: 'TypeScript', experiences: [] };
    const jobPostingText = 'Looking for TypeScript developer';

    const hash1 = createAnalysisHash(profileData, jobPostingText);
    const hash2 = createAnalysisHash(profileData, jobPostingText);
    const hash3 = createAnalysisHash(profileData, jobPostingText);

    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('should create different hashes for different profile data', () => {
    const profileData1 = { skills: 'TypeScript', experiences: [] };
    const profileData2 = { skills: 'Python', experiences: [] };
    const jobPostingText = 'Looking for developer';

    const hash1 = createAnalysisHash(profileData1, jobPostingText);
    const hash2 = createAnalysisHash(profileData2, jobPostingText);

    expect(hash1).not.toBe(hash2);
  });

  it('should create different hashes for different job postings', () => {
    const profileData = { skills: 'TypeScript', experiences: [] };
    const jobPostingText1 = 'Looking for TypeScript developer';
    const jobPostingText2 = 'Looking for Python developer';

    const hash1 = createAnalysisHash(profileData, jobPostingText1);
    const hash2 = createAnalysisHash(profileData, jobPostingText2);

    expect(hash1).not.toBe(hash2);
  });

  it('should normalize job posting text (trim whitespace)', () => {
    const profileData = { skills: 'TypeScript', experiences: [] };
    const jobPostingText1 = 'Looking for developer';
    const jobPostingText2 = '  Looking for developer  ';

    const hash1 = createAnalysisHash(profileData, jobPostingText1);
    const hash2 = createAnalysisHash(profileData, jobPostingText2);

    expect(hash1).toBe(hash2);
  });

  it('should handle empty profile data', () => {
    const profileData = {};
    const jobPostingText = 'Looking for developer';

    const hash = createAnalysisHash(profileData, jobPostingText);
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
  });

  it('should handle empty job posting text', () => {
    const profileData = { skills: 'TypeScript', experiences: [] };
    const jobPostingText = '';

    const hash = createAnalysisHash(profileData, jobPostingText);
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
  });
});

