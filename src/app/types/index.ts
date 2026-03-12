// Shared types for the application

// Auth types
export interface User {
  id: string;
  name: string;
  email: string;
  googleId?: string;
  biography?: string;
  role: 'USER' | 'ARTIST';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'USER' | 'ARTIST';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ArtistData {
  id: string;
  userId?: string;
  sqlUserId?: string;
  name: string;
  biography?: string | null;
  role: 'USER' | 'ARTIST';
  status: boolean;
  createdAt: string;
  socialMedia?: { id: string; url: string }[];
  coverImage?: string;
  profileImage?: string;
  followers?: number;
}

export interface Publication {
  id: string | number;
  // ── tipo de post ───────────────────────────────────────────
  type?: 'image' | 'audio';
  // ── campos comunes ─────────────────────────────────────────
  title?: string;
  content: string;          // embedUrl para audio, imageUrl para image
  description?: string;
  image?: string;
  date: string;
  created_at?: string;      // ISO string del backend
  // ── campos de audio ────────────────────────────────────────
  provider?: 'youtube' | 'soundcloud' | 'spotify' | 'bandcamp' | string;
  provider_meta?: {
    provider_url?: string;  // URL original pegada por el artista
  };
  // ── interacciones ──────────────────────────────────────────
  likes: number;
  isLiked: boolean;
  reactionId?: string;
  isSaved: boolean;
  author?: {
    name: string;
    avatar: string;
  };
  time?: string;
  text?: string;
  saved?: number;
}

export interface Event {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  description?: string;
  isAttending?: boolean;
  attending?: boolean;
}

export interface ProfileData {
  name: string;
  description: string;
  followers: number;
  instagram: string;
  facebook: string;
  whatsapp: string;
  email: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  googleId?: string | null;
  biography?: string | null;
  role: 'USER' | 'ARTIST';
  status: boolean;
  createdAt: string;
}

// Analytics types
export interface FollowerGrowthData {
  week: string;
  followers: number;
  date: string;
}

export interface InteractionData {
  week: string;
  interactions: number;
  date: string;
}

export interface EventAttendanceData {
  id: number;
  eventName: string;
  attendees: number;
}

export interface EventRatingData {
  id: number;
  eventName: string;
  averageRating: number;
  totalRatings: number;
}

export type TimeFilter = '7d' | '30d' | '90d' | '1y';

export interface AnalyticsHealth {
  status: string;
  message?: string;
  service?: string;
  checkedAt?: string;
}

export interface AnalyticsSummary {
  totalMetrics: number;
  totalSnapshots: number;
  activeConfigs: number;
  latestSnapshotDate: string | null;
  totalCalls: number;
  avgMeanExecTimeMs: number;
  sentSnapshots: number;
  pendingSnapshots: number;
}

export interface AnalyticsMetric {
  id: string;
  queryid: string;
  dbid: number | null;
  userid: number | null;
  query: string;
  calls: number;
  total_exec_time_ms: number;
  mean_exec_time_ms: number;
  min_exec_time_ms: number;
  max_exec_time_ms: number;
  stddev_exec_time_ms: number;
  rows_returned: number;
  shared_blks_hit: number;
  shared_blks_read: number;
  shared_blks_dirtied: number;
  shared_blks_written: number;
  temp_blks_read: number;
  temp_blks_written: number;
  snapshot_date?: string;
  ingestion_timestamp?: string;
}

export interface AnalyticsSnapshot {
  id: string;
  snapshot_date: string;
  sent_to_bigquery: boolean;
  sent_at?: string | null;
  created_at?: string;
}

export interface AnalyticsConfigEntry {
  id?: string;
  variable_name: string;
  variable_value: string;
  description?: string;
  updated_at?: string;
}

export interface AnalyticsConfigInput {
  variableName: string;
  variableValue: string;
  description?: string;
}

export interface AnalyticsWorkloadInput {
  iterations?: number;
  resetStats?: boolean;
}

export interface AnalyticsSnapshotInput {
  accessToken?: string;
  executeWorkload?: boolean;
  iterations?: number;
  limit?: number;
  resetStatsBeforeRun?: boolean;
}

export interface AnalyticsExportInput {
  accessToken?: string;
  executeWorkload?: boolean;
  iterations?: number;
  limit?: number;
}

export interface AnalyticsActionResult {
  message: string;
  payload?: unknown;
}