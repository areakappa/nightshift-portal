import { Injectable } from '@angular/core';
import { ScheduledNotificationDTO } from '../models/dto/ScheduledNotificationDTO';
import {
    UnavailabilityEntry,
    UnavailabilityStatus,
    UnavailabilityType
} from '../models/generic/unavailability/UnavailabilityEntry';
import { ReportOperatorUnavailabilityPayload, ScheduleService } from './schedule.service';

interface CreateOperatorRequestInput {
    userId: number;
    userName: string;
    startDateIso: string;
    endDateIso: string;
    type: UnavailabilityType;
    reason: string;
    shiftId?: number | null;
    serviceName?: string | null;
    roleName?: string | null;
    source?: 'manual' | 'shift';
}

interface CreateManagerAssignmentInput {
    managerUserId: number;
    managerName: string;
    userId: number;
    userName: string;
    startDateIso: string;
    endDateIso: string;
    type: UnavailabilityType;
    reason: string;
}

@Injectable({
    providedIn: 'root'
})
export class UnavailabilityService {
    private readonly storageKey = 'nightshift_unavailability_center_v1';
    private readonly webMediaTypeId = 1;
    private readonly managedNotificationMarkers = new Set([
        'OPERATOR_DEFECTION_REQUEST',
        'OPERATOR_UNAVAILABILITY_REQUEST'
    ]);

    constructor(private scheduleService: ScheduleService) { }

    getEntries(): UnavailabilityEntry[] {
        return this.readEntries().sort(
            (left, right) =>
                new Date(right.startDateIso).getTime() - new Date(left.startDateIso).getTime()
        );
    }

    getEntriesForUser(userId: number): UnavailabilityEntry[] {
        return this.getEntries().filter((entry) => entry.userId === userId);
    }

    getManagerInbox(): UnavailabilityEntry[] {
        return this.getEntries().filter(
            (entry) => entry.flow === 'operator_to_manager' && entry.status === 'pending'
        );
    }

    async createOperatorRequest(
        input: CreateOperatorRequestInput
    ): Promise<UnavailabilityEntry> {
        const nowIso = new Date().toISOString();
        const entry: UnavailabilityEntry = {
            id: this.buildId(
                'operator',
                input.userId,
                input.shiftId ?? null,
                input.startDateIso,
                input.endDateIso,
                input.type
            ),
            userId: input.userId,
            userName: input.userName,
            createdByUserId: input.userId,
            createdByName: input.userName,
            createdByRole: 'operator',
            flow: 'operator_to_manager',
            type: input.type,
            status: 'pending',
            startDateIso: input.startDateIso,
            endDateIso: input.endDateIso,
            reason: input.reason.trim(),
            managerNote: null,
            shiftId: input.shiftId ?? null,
            serviceName: input.serviceName ?? null,
            roleName: input.roleName ?? null,
            source: input.source ?? 'manual',
            notificationId: null,
            syncStatus: 'local_only',
            createdAtIso: nowIso,
            updatedAtIso: nowIso
        };

        try {
            const payload: ReportOperatorUnavailabilityPayload = {
                idShift: entry.shiftId,
                idUser: entry.userId,
                startDateTime: entry.startDateIso,
                endDateTime: entry.endDateIso,
                type: entry.type,
                reason: this.buildBackendReason(entry.type, entry.reason),
                source: entry.source === 'shift' ? 'operator_dashboard_shift' : 'operator_dashboard'
            };

            await this.scheduleService.reportOperatorUnavailability(payload);
            entry.syncStatus = 'synced';
        } catch (error) {
            console.warn('createOperatorRequest() backend unavailable:', error);
            entry.syncStatus = 'sync_failed';
        }

        this.upsertEntry(entry);
        return entry;
    }

    createManagerAssignment(input: CreateManagerAssignmentInput): UnavailabilityEntry {
        const nowIso = new Date().toISOString();
        const entry: UnavailabilityEntry = {
            id: this.buildId(
                'manager',
                input.userId,
                null,
                input.startDateIso,
                input.endDateIso,
                input.type
            ),
            userId: input.userId,
            userName: input.userName,
            createdByUserId: input.managerUserId,
            createdByName: input.managerName,
            createdByRole: 'manager',
            flow: 'manager_to_operator',
            type: input.type,
            status: 'approved',
            startDateIso: input.startDateIso,
            endDateIso: input.endDateIso,
            reason: input.reason.trim(),
            managerNote: 'Inserita dal manager',
            shiftId: null,
            serviceName: null,
            roleName: null,
            source: 'manual',
            notificationId: null,
            syncStatus: 'local_only',
            createdAtIso: nowIso,
            updatedAtIso: nowIso
        };

        this.upsertEntry(entry);
        return entry;
    }

    decideEntry(
        id: string,
        status: Extract<UnavailabilityStatus, 'approved' | 'rejected'>,
        note?: string | null
    ): UnavailabilityEntry | null {
        const entries = this.readEntries();
        const index = entries.findIndex((entry) => entry.id === id);
        if (index < 0) {
            return null;
        }

        const updated: UnavailabilityEntry = {
            ...entries[index],
            status,
            managerNote: note?.trim() || null,
            updatedAtIso: new Date().toISOString()
        };

        entries[index] = updated;
        this.writeEntries(entries);
        return updated;
    }

    decideEntryByNotificationId(
        notificationId: number,
        status: Extract<UnavailabilityStatus, 'approved' | 'rejected'>,
        note?: string | null
    ): UnavailabilityEntry | null {
        const entry = this.getEntries().find((item) => item.notificationId === notificationId);
        if (!entry) {
            return null;
        }

        return this.decideEntry(entry.id, status, note);
    }

    importManagerNotifications(notifications: ScheduledNotificationDTO[]): void {
        const entries = this.readEntries();
        let changed = false;

        notifications
            .filter((notification) => notification.idmediaType === this.webMediaTypeId)
            .filter((notification) => notification.state === 1)
            .filter((notification) => this.managedNotificationMarkers.has((notification.field4 ?? '').trim()))
            .forEach((notification) => {
                const id = `notification-${notification.id ?? 'na'}`;
                const existingIndex = entries.findIndex((entry) => entry.id === id);
                const matchingLocalIndex =
                    existingIndex < 0
                        ? this.findMatchingLocalRequestIndex(entries, notification)
                        : -1;
                const createdAtIso = this.normalizeIso(notification.created) ?? new Date().toISOString();
                const range = this.deriveRangeFromNotification(notification, createdAtIso);

                const baseEntry: UnavailabilityEntry = {
                    id,
                    userId: notification.idUserSender ?? notification.iduser ?? 0,
                    userName:
                        notification.nameUserSender?.trim() ||
                        notification.nameUser?.trim() ||
                        'Operatore',
                    createdByUserId: notification.idUserSender ?? notification.iduser ?? 0,
                    createdByName:
                        notification.nameUserSender?.trim() ||
                        notification.nameUser?.trim() ||
                        'Operatore',
                    createdByRole: 'operator',
                    flow: 'operator_to_manager',
                    type: this.detectTypeFromText(
                        [
                            notification.title,
                            notification.field1,
                            notification.field2,
                            notification.field3
                        ]
                            .filter(Boolean)
                            .join(' ')
                    ),
                    status: existingIndex >= 0 ? entries[existingIndex].status : 'pending',
                    startDateIso: range.startDateIso,
                    endDateIso: range.endDateIso,
                    reason: this.extractNotificationReason(notification),
                    managerNote: existingIndex >= 0 ? entries[existingIndex].managerNote : null,
                    shiftId: notification.idShift ?? null,
                    serviceName: notification.nameService?.trim() || notification.nameClient?.trim() || null,
                    roleName: notification.nameServiceType?.trim() || null,
                    source: 'notification',
                    notificationId: notification.id ?? null,
                    syncStatus: 'synced',
                    createdAtIso,
                    updatedAtIso: new Date().toISOString()
                };

                if (existingIndex >= 0) {
                    entries[existingIndex] = {
                        ...entries[existingIndex],
                        ...baseEntry,
                        status: entries[existingIndex].status,
                        managerNote: entries[existingIndex].managerNote
                    };
                } else if (matchingLocalIndex >= 0) {
                    entries[matchingLocalIndex] = {
                        ...entries[matchingLocalIndex],
                        notificationId: notification.id ?? entries[matchingLocalIndex].notificationId,
                        shiftId: notification.idShift ?? entries[matchingLocalIndex].shiftId,
                        serviceName:
                            notification.nameService?.trim() ||
                            notification.nameClient?.trim() ||
                            entries[matchingLocalIndex].serviceName,
                        roleName: notification.nameServiceType?.trim() || entries[matchingLocalIndex].roleName,
                        source: 'notification',
                        syncStatus: 'synced',
                        updatedAtIso: new Date().toISOString()
                    };
                } else {
                    entries.push(baseEntry);
                }

                changed = true;
            });

        if (changed) {
            this.writeEntries(entries);
        }
    }

    private findMatchingLocalRequestIndex(
        entries: UnavailabilityEntry[],
        notification: ScheduledNotificationDTO
    ): number {
        const notificationUserId = notification.idUserSender ?? notification.iduser ?? 0;
        const notificationShiftId = notification.idShift ?? null;
        const normalizedNotificationStart = this.normalizeIso(notification.startDate);
        const normalizedNotificationEnd = this.normalizeIso(notification.stopDate);

        return entries.findIndex((entry) => {
            if (entry.flow !== 'operator_to_manager') return false;
            if (entry.notificationId !== null && entry.notificationId !== undefined) return false;
            if (entry.userId !== notificationUserId) return false;

            // Shift-linked requests can be matched deterministically.
            if (notificationShiftId !== null && entry.shiftId !== null) {
                return entry.shiftId === notificationShiftId;
            }

            // Manual/day requests fallback to same user + same date window.
            if (entry.shiftId !== null || notificationShiftId !== null) return false;
            if (!normalizedNotificationStart || !normalizedNotificationEnd) return false;
            return (
                entry.startDateIso === normalizedNotificationStart &&
                entry.endDateIso === normalizedNotificationEnd
            );
        });
    }

    private readEntries(): UnavailabilityEntry[] {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) {
                return [];
            }

            const parsed = JSON.parse(raw) as UnavailabilityEntry[];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('readEntries() invalid storage data:', error);
            return [];
        }
    }

    private writeEntries(entries: UnavailabilityEntry[]): void {
        localStorage.setItem(this.storageKey, JSON.stringify(entries));
    }

    private upsertEntry(entry: UnavailabilityEntry): void {
        const entries = this.readEntries();
        const index = entries.findIndex((item) => item.id === entry.id);
        if (index >= 0) {
            entries[index] = {
                ...entries[index],
                ...entry,
                createdAtIso: entries[index].createdAtIso
            };
        } else {
            entries.push(entry);
        }

        this.writeEntries(entries);
    }

    private buildId(
        scope: 'operator' | 'manager',
        userId: number,
        shiftId: number | null,
        startDateIso: string,
        endDateIso: string,
        type: UnavailabilityType
    ): string {
        if (shiftId !== null) {
            return `${scope}-user-${userId}-shift-${shiftId}`;
        }

        return `${scope}-user-${userId}-range-${new Date(startDateIso).getTime()}-${new Date(endDateIso).getTime()}-${type}-${Date.now()}`;
    }

    private buildBackendReason(type: UnavailabilityType, reason: string): string {
        return `[${this.getTypeLabel(type)}] ${reason.trim()}`;
    }

    private getTypeLabel(type: UnavailabilityType): string {
        if (type === 'vacation') return 'Ferie';
        if (type === 'sick') return 'Malattia';
        if (type === 'permission') return 'Permesso';
        if (type === 'personal') return 'Motivi personali';
        return 'Altro';
    }

    private extractNotificationReason(notification: ScheduledNotificationDTO): string {
        const lines = [notification.field1, notification.field2, notification.field3]
            .map((value) => value?.trim() ?? '')
            .filter((value) => value.length > 0)
            .filter((value) => !value.startsWith('Tipo:'))
            .filter((value) => !value.startsWith('Periodo:'));

        return lines.length > 0 ? lines.join(' - ') : 'Richiesta ricevuta da notifica';
    }

    private detectTypeFromText(text: string): UnavailabilityType {
        const normalized = text.toLowerCase();
        if (normalized.includes('ferie')) return 'vacation';
        if (normalized.includes('malatt')) return 'sick';
        if (normalized.includes('permess')) return 'permission';
        if (normalized.includes('personal')) return 'personal';
        return 'other';
    }

    private normalizeIso(value: string | null): string | null {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    private deriveRangeFromNotification(
        notification: ScheduledNotificationDTO,
        fallbackIso: string
    ): { startDateIso: string; endDateIso: string } {
        const explicitStart = this.normalizeIso(notification.startDate);
        const explicitEnd = this.normalizeIso(notification.stopDate);
        if (explicitStart && explicitEnd) {
            return {
                startDateIso: explicitStart,
                endDateIso: explicitEnd
            };
        }

        const base = this.normalizeIso(notification.created) ?? fallbackIso;
        const start = new Date(base);
        start.setHours(0, 0, 0, 0);
        const end = new Date(base);
        end.setHours(23, 59, 59, 999);

        return {
            startDateIso: start.toISOString(),
            endDateIso: end.toISOString()
        };
    }
}
