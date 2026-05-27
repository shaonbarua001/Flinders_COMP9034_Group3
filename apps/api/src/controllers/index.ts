import type { ControllerContext } from './types.js';
import { registerAuthController } from './auth-controller.js';
import { registerExceptionController } from './exception-controller.js';
import { registerIntegrationController } from './integration-controller.js';
import { registerPayrollController } from './payroll-controller.js';
import { registerReportController } from './report-controller.js';
import { registerRosterController } from './roster-controller.js';
import { registerStaffController } from './staff-controller.js';
import { registerStationController } from './station-controller.js';
import { registerTimeEventController } from './time-event-controller.js';

export function registerControllers(ctx: ControllerContext): void {
  registerAuthController(ctx);
  registerIntegrationController(ctx);
  registerStaffController(ctx);
  registerStationController(ctx);
  registerRosterController(ctx);
  registerTimeEventController(ctx);
  registerReportController(ctx);
  registerExceptionController(ctx);
  registerPayrollController(ctx);
}
