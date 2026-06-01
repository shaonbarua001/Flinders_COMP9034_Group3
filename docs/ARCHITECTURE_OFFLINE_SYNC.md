# Offline Sync Reconciliation Architecture (Sprint Review 2)

## 1. Purpose
This document defines the architecture-level handling for delayed and out-of-order attendance events from offline clocking stations.

This is a specification document only. It does not represent implemented backend behavior in the current codebase.

## 2. Critical Edge Case
The system must safely handle:

1. A staff member clocks in at an offline station.
2. The staff member clocks out at another online station.
3. The server receives `clock_out` before the delayed offline `clock_in`.

Without reconciliation, this can create invalid attendance, duplicates, payroll inconsistencies, or failed downstream processing.

## 3. Reconciliation States
Each ingested attendance event and attendance pair is tracked by reconciliation state:

- `pending`: event accepted but matching pair is incomplete.
- `reconciled`: valid in/out sequence has been resolved.
- `duplicate`: same logical event received more than once.
- `conflict`: event cannot be safely resolved by automatic rules.
- `sync_failed`: event failed synchronization and requires retry.

## 4. Processing Model (Specification)
### 4.1 Ingestion
- Accept online and delayed offline attendance events through a common event ingestion path.
- Persist source metadata so operations can identify whether the event arrived from live station traffic or offline buffer replay.

### 4.2 Pending-State Handling
- If an event arrives without a valid counterpart (for example, `clock_out` first), store it as `pending`.
- Pending entries remain queryable for reconciliation and operations review.

### 4.3 Reconciliation Rules
- Reconciliation evaluates chronological event timestamps, not server receive order.
- Match by staff identity and event semantics (`clock_in` with `clock_out`).
- When delayed `clock_in` arrives and satisfies a pending `clock_out`, transition both into a reconciled attendance outcome.

### 4.4 Duplicate Detection
- Detect repeated submissions of the same logical event and mark as `duplicate`.
- Duplicates do not create additional attendance outcomes.

### 4.5 Conflict Handling
- Unresolvable timelines or ambiguous matches are marked `conflict`.
- Conflict records must be logged for manual review and retained for auditability.

### 4.6 Retry Handling
- Synchronization failures transition to `sync_failed`.
- Retries re-enter the same reconciliation pipeline and preserve traceability of attempts and outcomes.

## 5. Operational Review Workflow
- Operations/admin users review conflict and failed-sync queues.
- Manual decisions (merge, keep, reject, amend) are recorded in audit history.
- Resolution actions must preserve original event payload context for compliance and payroll traceability.

## 6. Manual Override & Amendment Governance (Sprint Review 2)
This section defines how emergency manual clock adjustments are controlled, approved, recorded, and linked to payroll recalculation.
It documents governance expectations only and does not introduce new schema, API, or runtime behavior in this ticket.

### 6.1 Control Requirements (Field-Level Traceability)
| Requirement | Existing field(s) / artifact | Governance rule |
|---|---|---|
| Reason required for every manual adjustment | `Amendment.reason` | Amendment cannot enter approval queue without a non-empty reason. |
| Original value and new value recorded | `Amendment.old_value`, `Amendment.new_value`, `Amendment.field_changed` | Changed field and before/after values are mandatory for traceability. |
| Admin ID recorded for change performer | `Amendment.admin_staff_id` | The initiating admin must be recorded on create. |
| Timestamp recorded for adjustment | `Amendment.amended_at`, `reviewedAt` | `amended_at` records change creation time; review timestamps are recorded at approval/review checkpoints. |
| Second approval required for sensitive changes | `Amendment.requires_second_approval`, `Amendment.approved_by_staff_id`, `AuditLog` entries | If sensitive, the approval path must include an additional approval checkpoint by a different authorized admin; final approver is stored in `approved_by_staff_id` and approval evidence is preserved in audit history. |
| Payroll recalculation triggered after approval | `Amendment.triggered_pay_recalc` | When approved and this flag is true, payroll recalculation is queued before payroll finalization. |
| Audit log protected from unauthorized modification | `AuditLog` + role-based access control | Audit history is append-only for operational users; update/delete is restricted to explicitly authorized system-level controls only. |

### 6.2 Operational Approval Workflow (Specification)
`Create Amendment -> Pending -> (Second Approval if required) -> Approved -> Apply change -> Audit append -> Payroll recalc queue`

1. Admin/Supervisor creates amendment with required `reason`, `field_changed`, `old_value`, `new_value`, and `admin_staff_id`.
2. Amendment enters pending review queue.
3. If `requires_second_approval = true`, the workflow requires an additional approval checkpoint by a different authorized admin before final approval.
4. Final approver identity is stored in `approved_by_staff_id`, and approval timestamps/checkpoints are recorded in audit history.
5. Approved amendment is applied to the target clock record while preserving the original value trail in amendment/audit artifacts.
6. `AuditLog` receives append-only records for create, approval, and apply actions.
7. If `triggered_pay_recalc = true`, the amendment is linked to payroll recalculation processing before payroll close/finalization.

### 6.3 Review and Auditability Scenarios (Documentation Acceptance)
Reviewers must be able to answer the following directly from this document:

1. Who can initiate changes, who can approve, and when second approval is mandatory.
2. Where before/after values are stored for each amendment.
3. How approved amendments trigger payroll recalculation.
4. Why audit records cannot be modified by unauthorized users.

## 7. Synchronization Traceability Fields (Spec-Level)
The architecture requires sync lifecycle metadata for each event:

- `source`: `online` or `offline_buffer`
- `capturedAt`: event capture time at station
- `uploadedAt`: time payload reached server endpoint
- `eventTimestamp`: staff action time used for chronological reconciliation
- `reconciliationStatus`: one of the defined states
- `syncAttempt`: retry counter
- `lastError`: latest failure reason if present
- `reconciledAt`: timestamp when state reached `reconciled`
- `reviewedBy` and `reviewedAt`: operator conflict-resolution markers

## 8. vNext Offline Upload Contract (Documentation Only)
Proposed payload shape for delayed station uploads:

```json
{
  "staffId": "staff01",
  "stationId": 3,
  "eventType": "clock_in",
  "methodType": "fingerprint",
  "eventTimestamp": "2026-05-31T22:30:00Z",
  "capturedAt": "2026-05-31T22:30:01Z",
  "uploadedAt": "2026-05-31T23:10:12Z",
  "networkStatus": "offline_buffered",
  "breakType": null,
  "syncMeta": {
    "source": "offline_buffer",
    "syncAttempt": 2,
    "lastError": null,
    "reconciliationStatus": "pending"
  }
}
```

This contract is for architecture alignment and implementation planning only.

## 9. Out of Scope for This Sprint Ticket
- No API/controller changes.
- No database migrations or new runtime tables.
- No reconciliation worker/job implementation.
- No changes to payroll calculation behavior.

## 10. Sprint Review 2 Demonstration Criteria
- The edge case and state transitions are fully documented.
- Reconciliation, duplicate, conflict, and retry behavior are unambiguous.
- Documentation explicitly states implementation is deferred and planned.
