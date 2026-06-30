export type UnavailabilityType =
    | 'vacation'
    | 'sick'
    | 'permission'
    | 'personal'
    | 'other';

export type UnavailabilityStatus = 'pending' | 'approved' | 'rejected';

export type UnavailabilityFlow = 'operator_to_manager' | 'manager_to_operator';

export type UnavailabilitySyncStatus = 'local_only' | 'synced' | 'sync_failed';

export interface UnavailabilityEntry {
    id: string;
    userId: number;
    userName: string;
    organizationId: number | null;
    createdByUserId: number;
    createdByName: string;
    createdByRole: 'operator' | 'manager';
    flow: UnavailabilityFlow;
    type: UnavailabilityType;
    status: UnavailabilityStatus;
    startDateIso: string;
    endDateIso: string;
    reason: string;
    managerNote: string | null;
    shiftId: number | null;
    serviceId: number | null;
    serviceName: string | null;
    roleName: string | null;
    source: 'manual' | 'shift' | 'notification';
    notificationId: number | null;
    syncStatus: UnavailabilitySyncStatus;
    createdAtIso: string;
    updatedAtIso: string;
}
