/**
 * Statistics Service
 * 
 * Provides anonymous statistics tracking for analysis usage.
 * 
 * **Privacy-First Design (NFR7):**
 * - Only tracks aggregated counters, no personal data
 * - NO IPs, NO timestamps per run, NO per-run logs, NO CV/JD content
 * - Statistics are stored locally in IndexedDB
 * - Optional endpoint support for batch sending (no personal data in requests)
 * 
 * **Statistics Tracked:**
 * - total_analyses: Total number of analyses run
 * - role_cluster_counts: Counts by role cluster (e.g., "Software Engineer", "Data Scientist")
 * - industry_cluster_counts: Counts by industry cluster (optional, can be "Unknown")
 * - ats_score_buckets: Counts by ATS score buckets (0-20, 21-40, 41-60, 61-80, 81-100)
 * 
 * @see src/lib/idb/db.ts for IndexedDB setup
 * @see src/utils/roleClustering.ts for role/industry extraction
 */

import { getDB, STATISTICS_STORE_NAME, type Statistics } from '../lib/idb'
import { extractRoleCluster, extractIndustryCluster, getAtsScoreBucket } from '../utils/roleClustering'
import type { AnalysisResult } from '../types/analysis.types'

/**
 * Feature flag: Enable statistics tracking
 * 
 * Set via environment variable: VITE_ENABLE_STATISTICS
 * Default: false (disabled for MVP)
 */
const ENABLE_STATISTICS = import.meta.env.VITE_ENABLE_STATISTICS === 'true'

/**
 * Optional endpoint for sending aggregated statistics
 * 
 * Set via environment variable: VITE_STATS_ENDPOINT
 * If not set, statistics are only stored locally
 */
const STATS_ENDPOINT = import.meta.env.VITE_STATS_ENDPOINT as string | undefined

/**
 * Statistics record ID (single record in IndexedDB)
 */
const STATISTICS_ID = 'statistics'

/**
 * Initialize default statistics structure
 */
function createDefaultStatistics(): Statistics {
  return {
    id: STATISTICS_ID,
    total_analyses: 0,
    role_cluster_counts: {},
    industry_cluster_counts: {},
    ats_score_buckets: {
      very_low: 0,
      low: 0,
      medium: 0,
      high: 0,
      very_high: 0,
      unknown: 0,
    },
  }
}

/**
 * Get current statistics from IndexedDB
 * 
 * Returns default statistics if none exist.
 * 
 * @returns Promise resolving to Statistics object
 */
export async function getStatistics(): Promise<Statistics> {
  if (!ENABLE_STATISTICS) {
    return createDefaultStatistics()
  }

  try {
    const db = await getDB()
    const statistics = await db.get(STATISTICS_STORE_NAME, STATISTICS_ID)
    
    if (statistics) {
      return statistics
    }
    
    // Return default if no statistics exist
    return createDefaultStatistics()
  } catch (error) {
    // If IndexedDB fails, return default (don't break app)
    console.warn('Failed to retrieve statistics:', error)
    return createDefaultStatistics()
  }
}

/**
 * Track an analysis for statistics
 * 
 * Increments counters for:
 * - total_analyses
 * - role_cluster_counts (based on job posting)
 * - industry_cluster_counts (based on job posting)
 * - ats_score_buckets (based on ATS score)
 * 
 * **Privacy-First:**
 * - Only extracts generic categories (role cluster, industry cluster)
 * - NO personal data is stored
 * - NO job posting content is stored
 * - NO profile data is stored
 * 
 * @param analysisResult - Analysis result (only ATS score is used)
 * @param jobPostingText - Job posting text (only for role/industry extraction)
 */
export async function trackAnalysis(
  analysisResult: AnalysisResult,
  jobPostingText: string
): Promise<void> {
  // Skip tracking if feature is disabled
  if (!ENABLE_STATISTICS) {
    return
  }

  try {
    // Get current statistics
    const statistics = await getStatistics()

    // Increment total analyses
    statistics.total_analyses += 1

    // Extract and increment role cluster
    const roleCluster = extractRoleCluster(jobPostingText)
    statistics.role_cluster_counts[roleCluster] =
      (statistics.role_cluster_counts[roleCluster] || 0) + 1

    // Extract and increment industry cluster
    const industryCluster = extractIndustryCluster(jobPostingText)
    statistics.industry_cluster_counts[industryCluster] =
      (statistics.industry_cluster_counts[industryCluster] || 0) + 1

    // Extract and increment ATS score bucket
    const atsScore = analysisResult.ats?.score ?? 0
    const atsBucket = getAtsScoreBucket(atsScore)
    statistics.ats_score_buckets[atsBucket] =
      (statistics.ats_score_buckets[atsBucket] || 0) + 1

    // Save updated statistics to IndexedDB
    const db = await getDB()
    await db.put(STATISTICS_STORE_NAME, statistics)
  } catch (error) {
    // If tracking fails, log warning but don't break analysis
    console.warn('Failed to track statistics:', error)
  }
}

/**
 * Reset all statistics (useful for testing or privacy)
 * 
 * Clears all counters and resets to default state.
 */
export async function resetStatistics(): Promise<void> {
  if (!ENABLE_STATISTICS) {
    return
  }

  try {
    const db = await getDB()
    const defaultStats = createDefaultStatistics()
    await db.put(STATISTICS_STORE_NAME, defaultStats)
  } catch (error) {
    console.warn('Failed to reset statistics:', error)
    throw error
  }
}

/**
 * Send aggregated statistics to optional endpoint
 * 
 * Sends statistics as batch (no personal data).
 * Handles errors gracefully (doesn't break app if endpoint fails).
 * 
 * **Privacy-First:**
 * - Only sends aggregated counters
 * - NO personal data in request
 * - NO IPs, NO timestamps, NO per-run data
 */
export async function sendStatisticsToEndpoint(): Promise<void> {
  if (!ENABLE_STATISTICS || !STATS_ENDPOINT) {
    return
  }

  try {
    const statistics = await getStatistics()
    
    // Send only aggregated counters (no personal data)
    const response = await fetch(STATS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        total_analyses: statistics.total_analyses,
        role_cluster_counts: statistics.role_cluster_counts,
        industry_cluster_counts: statistics.industry_cluster_counts,
        ats_score_buckets: statistics.ats_score_buckets,
      }),
    })

    if (!response.ok) {
      console.warn(`Statistics endpoint returned ${response.status}`)
    }
  } catch (error) {
    // Don't break app if endpoint fails
    console.warn('Failed to send statistics to endpoint:', error)
  }
}

/**
 * Check if statistics tracking is enabled
 * 
 * @returns true if statistics tracking is enabled, false otherwise
 */
export function isStatisticsEnabled(): boolean {
  return ENABLE_STATISTICS
}

