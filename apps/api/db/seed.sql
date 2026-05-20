BEGIN;

INSERT INTO staff (
  id,
  staff_id,
  name,
  contract_type,
  standard_hours,
  role,
  standard_rate,
  overtime_rate,
  password_hash,
  active
) VALUES
  (1, 'admin01', 'System Admin', 'full_time', 38, 'admin', 52, 78, '$2a$10$ljEf6YvaVu08mnLA9cc8tO7aNqbk8YSJixgAYqoRfCLgz6hsWolJC', TRUE),
  (2, 'staff01', 'Ava Orchard', 'full_time', 38, 'staff', 34, 51, '$2a$10$ljEf6YvaVu08mnLA9cc8tO7aNqbk8YSJixgAYqoRfCLgz6hsWolJC', TRUE),
  (3, 'staff02', 'Luca Bennett', 'part_time', 24, 'staff', 30, 45, '$2a$10$ljEf6YvaVu08mnLA9cc8tO7aNqbk8YSJixgAYqoRfCLgz6hsWolJC', TRUE),
  (4, 'staff03', 'Mia Santos', 'casual', 18, 'staff', 31.5, 47.25, '$2a$10$ljEf6YvaVu08mnLA9cc8tO7aNqbk8YSJixgAYqoRfCLgz6hsWolJC', TRUE),
  (5, 'staff04', 'Noah Patel', 'full_time', 38, 'staff', 33, 49.5, '$2a$10$ljEf6YvaVu08mnLA9cc8tO7aNqbk8YSJixgAYqoRfCLgz6hsWolJC', TRUE),
  (6, 'staff05', 'Ella Nguyen', 'casual', 20, 'staff', 29.5, 44.25, '$2a$10$ljEf6YvaVu08mnLA9cc8tO7aNqbk8YSJixgAYqoRfCLgz6hsWolJC', FALSE);

INSERT INTO stations (id, name, location, method_type, active) VALUES
  (1, 'North Orchard Gate', 'North Orchard', 'fingerprint', TRUE),
  (2, 'Packhouse Entry', 'Packing Shed', 'card', TRUE),
  (3, 'Cold Room Access', 'Cold Storage', 'face', TRUE),
  (4, 'Dispatch Ramp', 'Loading Dock', 'card', TRUE);

INSERT INTO staff_identity_methods (staff_id, method_type, external_ref, status, enrolled_at) VALUES
  (2, 'fingerprint', 'fp-ava-2026', 'registered', NOW() - INTERVAL '45 days'),
  (2, 'card', 'card-ava-2026', 'active', NOW() - INTERVAL '45 days'),
  (3, 'card', 'card-luca-2026', 'active', NOW() - INTERVAL '32 days'),
  (4, 'face', 'face-mia-2026', 'active', NOW() - INTERVAL '18 days'),
  (5, 'fingerprint', 'fp-noah-2026', 'registered', NOW() - INTERVAL '12 days'),
  (5, 'card', 'card-noah-2026', 'active', NOW() - INTERVAL '12 days'),
  (6, 'card', 'card-ella-2026', 'pending', NOW() - INTERVAL '3 days');

INSERT INTO rosters (staff_id, station_id, roster_date, start_time, planned_hours, notes) VALUES
  (2, 1, (CURRENT_DATE - INTERVAL '2 days')::date, '07:30', 8, 'Early orchard harvest block'),
  (3, 2, (CURRENT_DATE - INTERVAL '2 days')::date, '09:00', 6, 'Packing and labeling'),
  (5, 4, (CURRENT_DATE - INTERVAL '2 days')::date, '10:00', 8, 'Dispatch coordination'),
  (2, 1, (CURRENT_DATE - INTERVAL '1 day')::date, '07:30', 8, 'Fruit quality check and harvest'),
  (4, 3, (CURRENT_DATE - INTERVAL '1 day')::date, '12:00', 5, 'Cold-room stock movement'),
  (5, 2, (CURRENT_DATE - INTERVAL '1 day')::date, '08:00', 8, 'Packhouse supervision'),
  (2, 2, CURRENT_DATE, '08:00', 8, 'Packhouse overflow support'),
  (3, 2, CURRENT_DATE, '09:30', 5.5, 'Short packaging shift'),
  (4, 4, CURRENT_DATE, '13:00', 4, 'Afternoon dispatch support'),
  (5, 1, CURRENT_DATE, '07:00', 8, 'Morning gate and roster cover'),
  (2, 1, (CURRENT_DATE + INTERVAL '1 day')::date, '07:30', 8, 'Weekend irrigation audit'),
  (3, 2, (CURRENT_DATE + INTERVAL '1 day')::date, '09:00', 6, 'Weekend packhouse crew'),
  (4, 4, (CURRENT_DATE + INTERVAL '1 day')::date, '12:00', 4, 'Dispatch relief shift');

INSERT INTO time_events (id, staff_id, station_id, event_type, method_type, break_type, event_timestamp, reason, created_by) VALUES
  (1, 2, 1, 'clock_in', 'fingerprint', NULL, CURRENT_TIMESTAMP - INTERVAL '50 hours', NULL, 'staff01'),
  (2, 2, 1, 'break_start', 'fingerprint', 'lunch', CURRENT_TIMESTAMP - INTERVAL '45 hours 30 minutes', NULL, 'staff01'),
  (3, 2, 1, 'break_end', 'fingerprint', 'lunch', CURRENT_TIMESTAMP - INTERVAL '45 hours', NULL, 'staff01'),
  (4, 2, 4, 'clock_out', 'card', NULL, CURRENT_TIMESTAMP - INTERVAL '41 hours 30 minutes', NULL, 'staff01'),
  (5, 3, 2, 'clock_in', 'card', NULL, CURRENT_TIMESTAMP - INTERVAL '48 hours 30 minutes', NULL, 'staff02'),
  (6, 3, 2, 'clock_out', 'card', NULL, CURRENT_TIMESTAMP - INTERVAL '42 hours 20 minutes', NULL, 'staff02'),
  (7, 5, 4, 'clock_in', 'card', NULL, CURRENT_TIMESTAMP - INTERVAL '47 hours', NULL, 'staff04'),
  (8, 5, 4, 'break_start', 'card', 'meal', CURRENT_TIMESTAMP - INTERVAL '44 hours', NULL, 'staff04'),
  (9, 5, 4, 'break_end', 'card', 'meal', CURRENT_TIMESTAMP - INTERVAL '43 hours 33 minutes', NULL, 'staff04'),
  (10, 5, 4, 'clock_out', 'card', NULL, CURRENT_TIMESTAMP - INTERVAL '38 hours 50 minutes', NULL, 'staff04'),
  (11, 2, 1, 'clock_in', 'fingerprint', NULL, CURRENT_TIMESTAMP - INTERVAL '26 hours 30 minutes', NULL, 'staff01'),
  (12, 2, 1, 'break_start', 'fingerprint', 'lunch', CURRENT_TIMESTAMP - INTERVAL '22 hours', NULL, 'staff01'),
  (13, 2, 1, 'break_end', 'fingerprint', 'lunch', CURRENT_TIMESTAMP - INTERVAL '21 hours 29 minutes', NULL, 'staff01'),
  (14, 2, 2, 'clock_out', 'card', NULL, CURRENT_TIMESTAMP - INTERVAL '17 hours 45 minutes', NULL, 'staff01'),
  (15, 4, 3, 'clock_in', 'face', NULL, CURRENT_TIMESTAMP - INTERVAL '18 hours 5 minutes', NULL, 'staff03'),
  (16, 5, 2, 'clock_in', 'fingerprint', NULL, CURRENT_TIMESTAMP - INTERVAL '22 hours 40 minutes', NULL, 'staff04'),
  (17, 5, 2, 'break_start', 'card', 'lunch', CURRENT_TIMESTAMP - INTERVAL '18 hours 42 minutes', NULL, 'staff04'),
  (18, 5, 2, 'break_end', 'card', 'lunch', CURRENT_TIMESTAMP - INTERVAL '18 hours 19 minutes', NULL, 'staff04'),
  (19, 5, 2, 'clock_out', 'card', NULL, CURRENT_TIMESTAMP - INTERVAL '14 hours 32 minutes', NULL, 'staff04'),
  (20, 2, 2, 'clock_in', 'card', NULL, CURRENT_TIMESTAMP - INTERVAL '6 hours', NULL, 'staff01'),
  (21, 3, 2, 'clock_in', 'card', NULL, CURRENT_TIMESTAMP - INTERVAL '4 hours 30 minutes', NULL, 'staff02');

INSERT INTO time_adjustments (time_event_id, before_payload, after_payload, reason, adjusted_by) VALUES
  (
    6,
    '{"event_timestamp":"reader-sync-adjustment-old"}'::jsonb,
    '{"event_timestamp":"reader-sync-adjustment-new"}'::jsonb,
    'Corrected card reader sync delay at Packhouse Entry',
    'admin01'
  ),
  (
    15,
    '{"station_id":4}'::jsonb,
    '{"station_id":3}'::jsonb,
    'Updated station after supervisor verified cold-room entry camera',
    'admin01'
  );

INSERT INTO exceptions (type, staff_id, exception_date, severity, notes, status, resolved_by, resolved_at) VALUES
  ('missing_clock_out', 4, (CURRENT_DATE - INTERVAL '1 day')::date, 'high', 'Casual shift is still open and needs supervisor review.', 'open', NULL, NULL),
  ('no_break_over_4_hours', 3, (CURRENT_DATE - INTERVAL '2 days')::date, 'medium', 'Break was not recorded on a 6-hour packaging shift.', 'resolved', 'admin01', NOW() - INTERVAL '1 day'),
  ('unrostered_attempt', 6, CURRENT_DATE, 'medium', 'Inactive casual account attempted card use at Packhouse Entry.', 'open', NULL, NULL);

INSERT INTO pay_periods (id, start_date, end_date, status) VALUES
  (1, (CURRENT_DATE - INTERVAL '27 days')::date, (CURRENT_DATE - INTERVAL '14 days')::date, 'closed'),
  (2, (CURRENT_DATE - INTERVAL '13 days')::date, CURRENT_DATE, 'open');

INSERT INTO pay_runs (id, pay_period_id, status, generated_at, finalized_at, created_by) VALUES
  (1, 1, 'finalized', NOW() - INTERVAL '13 days', NOW() - INTERVAL '12 days', 'admin01'),
  (2, 2, 'draft', NOW() - INTERVAL '6 hours', NULL, 'admin01');

INSERT INTO pay_run_items (pay_run_id, staff_id, hours, overtime_hours, base_pay, overtime_pay, deductions, total_pay, details) VALUES
  (1, 2, 76, 4, 2584, 204, 0, 2788, '{"note":"finalized fortnight pay","period":"previous"}'::jsonb),
  (1, 3, 46, 0, 1380, 0, 0, 1380, '{"note":"finalized fortnight pay","period":"previous"}'::jsonb),
  (1, 4, 22, 0, 693, 0, 0, 693, '{"note":"finalized fortnight pay","period":"previous"}'::jsonb),
  (1, 5, 79, 3, 2607, 148.5, 0, 2755.5, '{"note":"finalized fortnight pay","period":"previous"}'::jsonb),
  (2, 2, 61.5, 1.5, 2091, 76.5, 0, 2167.5, '{"note":"current draft pay run","period":"current"}'::jsonb),
  (2, 3, 35.5, 0, 1065, 0, 0, 1065, '{"note":"current draft pay run","period":"current"}'::jsonb),
  (2, 4, 14, 0, 441, 0, 0, 441, '{"note":"current draft pay run","period":"current"}'::jsonb),
  (2, 5, 64, 2, 2112, 99, 0, 2211, '{"note":"current draft pay run","period":"current"}'::jsonb);

INSERT INTO audit_logs (actor, action, entity, entity_id, payload) VALUES
  ('admin01', 'seed.bootstrap', 'system', 'seed-current-demo', '{"source":"apps/api/db/seed.sql","kind":"rolling-demo-data"}'::jsonb),
  ('admin01', 'payrun.generate', 'pay_runs', '2', '{"status":"draft","pay_period_id":2}'::jsonb),
  ('admin01', 'exception.resolve', 'exceptions', '2', '{"notes":"Supervisor confirmed manual rest break was taken"}'::jsonb);

SELECT setval('staff_id_seq', (SELECT MAX(id) FROM staff));
SELECT setval('stations_id_seq', (SELECT MAX(id) FROM stations));
SELECT setval('staff_identity_methods_id_seq', (SELECT MAX(id) FROM staff_identity_methods));
SELECT setval('rosters_id_seq', (SELECT MAX(id) FROM rosters));
SELECT setval('time_events_id_seq', (SELECT MAX(id) FROM time_events));
SELECT setval('time_adjustments_id_seq', (SELECT MAX(id) FROM time_adjustments));
SELECT setval('pay_periods_id_seq', (SELECT MAX(id) FROM pay_periods));
SELECT setval('pay_runs_id_seq', (SELECT MAX(id) FROM pay_runs));
SELECT setval('pay_run_items_id_seq', (SELECT MAX(id) FROM pay_run_items));
SELECT setval('exceptions_id_seq', (SELECT MAX(id) FROM exceptions));
SELECT setval('audit_logs_id_seq', (SELECT MAX(id) FROM audit_logs));

COMMIT;
