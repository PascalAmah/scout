/**
 * Ergonomic aliases over the OpenAPI-generated types.
 *
 * The raw generated surface (packages/types/src/generated.ts) is a faithful
 * dump of /openapi.json; this file is the stable import surface the web app
 * (and extension) consume. Regenerate with:
 *
 *   cd apps/api && python scripts/export_openapi.py
 *   cd packages/types && pnpm generate
 */

import type { components } from './generated'

export type { paths, operations, components } from './generated'

type Schema = components['schemas']

// --- auth ---
export type User = Schema['UserOut']
export type TokenResponse = Schema['TokenResponse']
export type UserPatch = Schema['UserPatch']

// --- startups ---
export type StartupListItem = Schema['StartupListItem']
export type StartupDetail = Schema['StartupDetail']
export type StartupCreate = Schema['StartupCreate']
export type StartupPatch = Schema['StartupPatch']
export type StartupOut = Schema['StartupOut']
export type FounderOut = Schema['FounderOut']
export type FounderCreate = Schema['FounderCreate']
export type JobOut = Schema['JobOut']
export type JobCreate = Schema['JobCreate']
export type NoteOut = Schema['NoteOut']
export type EnrichmentJobOut = Schema['EnrichmentJobOut']

// --- cv / matches ---
export type CVProfileOut = Schema['CVProfileOut']
export type MatchOut = Schema['MatchOut']
export type MatchExplanation = Schema['MatchExplanation']
export type ComputeMatchOut = Schema['ComputeMatchOut']

// --- resumes / outreach ---
export type ResumeOut = Schema['ResumeOut']
export type ResumeVersionOut = Schema['ResumeVersionOut']
export type ResumeCreate = Schema['ResumeCreate']
export type ResumePatch = Schema['ResumePatch']
export type ResumeGenerateAccepted = Schema['ResumeGenerateAccepted']
export type OutreachOut = Schema['OutreachOut']
export type OutreachPatch = Schema['OutreachPatch']
export type OutreachGenerateAccepted = Schema['OutreachGenerateAccepted']
export type FollowUpOut = Schema['FollowUpOut']
export type FollowUpAccepted = Schema['FollowUpAccepted']

// --- applications / crm ---
export type ApplicationOut = Schema['ApplicationOut']
export type ApplicationDetail = Schema['ApplicationDetail']
export type ApplicationCreate = Schema['ApplicationCreate']
export type ApplicationPatch = Schema['ApplicationPatch']
export type ApplicationStartup = Schema['ApplicationStartup']
export type ApplicationJob = Schema['ApplicationJob']
export type TimelineEvent = Schema['TimelineEvent']
export type ResumeVersionRef = Schema['ResumeVersionRef']
export type LastOutreachRef = Schema['LastOutreachRef']

// --- notifications ---
export type NotificationOut = Schema['NotificationOut']
export type UnreadCountOut = Schema['UnreadCountOut']

// --- extension ---
export type DetectRequest = Schema['DetectRequest']
export type DetectResponse = Schema['DetectResponse']
export type DetectedStartup = Schema['DetectedStartup']
export type DetectedJob = Schema['DetectedJob']
export type QuickSaveRequest = Schema['QuickSaveRequest']
export type QuickSaveResponse = Schema['QuickSaveResponse']
export type QuickSaveStartup = Schema['QuickSaveStartup']
export type QuickSaveJob = Schema['QuickSaveJob']
export type QuickSaveFounder = Schema['QuickSaveFounder']

// --- analytics ---
export type AnalyticsSummary = Schema['AnalyticsSummaryOut']
export type RatePoint = Schema['RatePoint']
export type FunnelStage = Schema['FunnelStageOut']
export type FunnelConversion = Schema['FunnelConversionOut']
export type Funnel = Schema['FunnelOut']

// --- pagination ---
export type PageStartupList = Schema['Page_StartupListItem_']
export type PageMatchOut = Schema['Page_MatchOut_']
export type PageApplicationOut = Schema['Page_ApplicationOut_']
export type PageNotificationOut = Schema['Page_NotificationOut_']

/** Generic cursor-page shape shared by all list endpoints. */
export interface Page<T> {
  data: T[]
  next_cursor: string | null
}
