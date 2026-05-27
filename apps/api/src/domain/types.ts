import type { Queryable } from '../db/types.js';
import type { SupabaseConfig } from '../lib/runtime-config.js';

export interface AppDeps {
  db: Queryable;
  authSecret: string;
  supabase: SupabaseConfig;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface DateTimeBounds {
  start: string;
  endExclusive: string;
}

export interface TimeEvent {
  eventType: string;
  timestamp: string;
}
