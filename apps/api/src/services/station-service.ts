import { NotFoundError } from '../domain/errors.js';
import type { Repositories } from '../repositories/app-repositories.js';

export interface StationService {
  create(input: {
    actor: string;
    name: string;
    location: string;
    methodType: string;
  }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
  list(): Promise<{ data: Record<string, unknown>[] }>;
  update(input: {
    actor: string;
    id: string;
    patch: { name?: string; location?: string; methodType?: string; active?: boolean };
  }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
  deactivate(input: { actor: string; id: string }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
}

export function createStationService(repositories: Repositories): StationService {
  return {
    async create(input) {
      const station = await repositories.station.create({
        name: input.name,
        location: input.location,
        methodType: input.methodType
      });
      const auditReferenceId = await repositories.audit.log(
        input.actor,
        'station.create',
        'station',
        String(station.id),
        station
      );
      return { data: station, auditReferenceId };
    },
    async list() {
      return { data: await repositories.station.list() };
    },
    async update(input) {
      const updated = await repositories.station.update(input.id, input.patch);
      if (!updated) {
        throw new NotFoundError('station_not_found');
      }
      const auditReferenceId = await repositories.audit.log(
        input.actor,
        'station.update',
        'station',
        input.id,
        input.patch
      );
      return { data: updated, auditReferenceId };
    },
    async deactivate(input) {
      const deactivated = await repositories.station.deactivate(input.id);
      if (!deactivated) {
        throw new NotFoundError('station_not_found');
      }
      const auditReferenceId = await repositories.audit.log(
        input.actor,
        'station.deactivate',
        'station',
        input.id,
        { active: false }
      );
      return { data: deactivated, auditReferenceId };
    }
  };
}
