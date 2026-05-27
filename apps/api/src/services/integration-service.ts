import type { Queryable } from '../db/types.js';
import type { SupabaseConfig } from '../lib/runtime-config.js';
import { getSupabaseStatus } from '../lib/supabase.js';

export interface IntegrationService {
  getSupabaseStatus(): ReturnType<typeof getSupabaseStatus>;
}

export function createIntegrationService(db: Queryable, supabase: SupabaseConfig): IntegrationService {
  return {
    getSupabaseStatus() {
      return getSupabaseStatus(db, supabase);
    }
  };
}
