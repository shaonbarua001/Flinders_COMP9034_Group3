export const COMPLIANCE_RULE_CODES = {
  maxWeeklyHours: 'MAX_WEEKLY_HOURS',
  maxHoursWithoutBreak: 'MAX_HOURS_WITHOUT_BREAK',
  overtimePenaltyMultiplier: 'OVERTIME_PENALTY_MULTIPLIER'
} as const;

export const DEFAULT_COMPLIANCE_THRESHOLDS = {
  maxWeeklyHours: 38,
  maxHoursWithoutBreak: 4
} as const;
