import type { AppDeps } from '../domain/types.js';
import { createRepositories } from '../repositories/app-repositories.js';
import { createAuthService } from './auth-service.js';
import { createExceptionService } from './exception-service.js';
import { createIntegrationService } from './integration-service.js';
import { createPayrollService } from './payroll-service.js';
import { createReportService } from './report-service.js';
import { createRosterService } from './roster-service.js';
import { createStaffService } from './staff-service.js';
import { createStationService } from './station-service.js';
import { createTimeEventService } from './time-event-service.js';

export function createServices(deps: AppDeps) {
  const repositories = createRepositories(deps.db);

  return {
    auth: createAuthService(repositories, deps.authSecret),
    staff: createStaffService(repositories),
    station: createStationService(repositories),
    roster: createRosterService(repositories),
    timeEvent: createTimeEventService(repositories),
    report: createReportService(repositories),
    exception: createExceptionService(repositories),
    payroll: createPayrollService(deps.db),
    integration: createIntegrationService(deps.db, deps.supabase)
  };
}

export type AppServices = ReturnType<typeof createServices>;
