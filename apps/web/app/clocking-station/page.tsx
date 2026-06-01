'use client';

import { useEffect, useState } from 'react';
import { useSession } from '../lib/auth';
import { apiGet, apiPost } from '../lib/api';

interface StaffRow {
  staff_id: string;
  name: string;
}

interface StationRow {
  id: number;
  name: string;
  method_type: string;
}

interface EventLog {
  at: string;
  staffId: string;
  stationId?: number;
  action: string;
}

export default function ClockingStationPage() {
  const { session } = useSession();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [staffId, setStaffId] = useState('');
  const [stationId, setStationId] = useState(1);
  const [methodType, setMethodType] = useState<'card' | 'face' | 'fingerprint' | 'retinal'>('fingerprint');
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [clockedIn, setClockedIn] = useState(false);

  useEffect(() => {
    if (!session) return;

    const staffPromise =
      session.role === 'admin'
        ? apiGet<{ data: StaffRow[] }>('/staff', { role: 'admin' }).then((d) => d.data)
        : Promise.resolve([{ staff_id: session.staffId, name: session.staffId }]);

    Promise.all([staffPromise, apiGet<{ data: StationRow[] }>('/stations')])
      .then(([staffRows, stationData]) => {
        setStaff(staffRows);
        setStations(stationData.data);
        setStationId(stationData.data[0]?.id ?? 1);
        setStaffId(staffRows[0]?.staff_id ?? '');
      })
      .catch(() => undefined);
  }, [session]);

  useEffect(() => {
    if (!session || !staffId) {
      setClockedIn(false);
      return;
    }

    apiGet<{ data: { staffId: string; clockedIn: boolean; lastEventType: string | null } }>(
      `/time-events/status?staffId=${encodeURIComponent(staffId)}`
    )
      .then((result) => setClockedIn(result.data.clockedIn))
      .catch(() => setClockedIn(false));
  }, [session, staffId]);

  async function pushEvent(eventType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end', breakType?: 'tea' | 'lunch' | 'safety') {
    if (!staffId) return;
    try {
      const timestamp = new Date().toISOString();
      const isAdminManualClockAction =
        session?.role === 'admin' && (eventType === 'clock_in' || eventType === 'clock_out');
      let path = '/time-events';
      let body: Record<string, unknown> = {
        staffId,
        stationId,
        eventType,
        methodType,
        timestamp,
        breakType
      };

      if (isAdminManualClockAction) {
        const reason = window.prompt(`Reason for manual ${eventType === 'clock_in' ? 'clock in' : 'clock out'}:`);
        if (!reason || !reason.trim()) {
          return;
        }
        path = '/time-events/manual';
        body = {
          staffId,
          stationId,
          eventType,
          methodType,
          timestamp,
          reason: reason.trim()
        };
      }

      await apiPost(path, body);
      setLogs((prev) => [
        { at: new Date().toLocaleTimeString(), staffId, stationId, action: breakType ? `${eventType}:${breakType}` : eventType },
        ...prev
      ].slice(0, 10));

      const status = await apiGet<{ data: { clockedIn: boolean } }>(`/time-events/status?staffId=${encodeURIComponent(staffId)}`);
      setClockedIn(status.data.clockedIn);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('staff_not_clocked_in')) {
        window.alert('Please clock in first');
        return;
      }
      window.alert('Action failed. Please try again.');
    }
  }

  function showOfflineJsonUploadPolicy(): void {
    window.alert(
      [
        'Offline JSON Attendance Upload (Planned):',
        '- Policy: offline station JSON payloads must follow the documented reconciliation metadata contract.',
        '- Policy: uploaded events will be assessed under pending/reconciled/duplicate/conflict/sync_failed states.',
        '- This upload feature is not implemented in this sprint ticket.',
        '- Current button is informational only and performs no upload logic.'
      ].join('\n')
    );
  }

  return (
    <>
      <section className="section grid-2">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Clocking Station</h2>
          <p style={{ color: 'var(--on-surface-variant)' }}>
            Scanner prompt, high-contrast controls, and offline buffering awareness with delayed sync reconciliation notes.
          </p>
          <div className="overlay" style={{ marginTop: '0.8rem' }}>
            Weather/Hydration Alert: 31C, high UV. Enforce extra water break every 90 minutes.
          </div>
          <button className="secondary-button" style={{ marginTop: '0.8rem', minHeight: 48 }} onClick={showOfflineJsonUploadPolicy}>
            Upload JSON Attendance
          </button>
        </div>
        <div className="panel" style={{ display: 'grid', gap: '0.6rem' }}>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Scan or select staff</option>
            {staff.map((person) => (
              <option key={person.staff_id} value={person.staff_id}>{person.staff_id} - {person.name}</option>
            ))}
          </select>
          <select value={stationId} onChange={(e) => setStationId(Number(e.target.value))}>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>{station.name}</option>
            ))}
          </select>
          <select value={methodType} onChange={(e) => setMethodType(e.target.value as typeof methodType)}>
            <option value="card">Card</option>
            <option value="face">Face</option>
            <option value="fingerprint">Fingerprint</option>
            <option value="retinal">Retinal</option>
          </select>
        </div>
      </section>

      <section className="section grid-2">
        <div className="panel" style={{ display: 'grid', gap: '0.6rem' }}>
          <button className="primary-button" onClick={() => pushEvent('clock_in')}>Clock In</button>
          <button className="primary-button" onClick={() => pushEvent('clock_out')}>Clock Out</button>
          <div className="grid-3">
            <button className="secondary-button" style={{ minHeight: 48 }} disabled={!staffId || !clockedIn} onClick={() => pushEvent('break_start', 'tea')}>Tea Break</button>
            <button className="secondary-button" style={{ minHeight: 48 }} disabled={!staffId || !clockedIn} onClick={() => pushEvent('break_start', 'lunch')}>Lunch</button>
            <button className="secondary-button" style={{ minHeight: 48 }} disabled={!staffId || !clockedIn} onClick={() => pushEvent('break_start', 'safety')}>Safety Check</button>
          </div>
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Recent Terminal Activity</h3>
          {logs.map((log, idx) => (
            <div key={`${log.at}-${idx}`} style={{ padding: '0.3rem 0' }}>
              <strong>{log.at}</strong> - {log.staffId} - {log.action}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
