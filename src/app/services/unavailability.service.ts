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
    organizationId?: number | null;
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
    organizationId?: number | null;
    userId: number;
    userName: string;
    startDateIso: string;
    endDateIso: string;
    type: UnavailabilityType;
    reason: string;
}

interface ScheduledNotificationWithTask extends ScheduledNotificationDTO {
    idscheduleTaskNavigation?: {
        id?: number | null;
        idUserSender?: number | null;
        startDate?: string | null;
        stopDate?: string | null;
        created?: string | null;
    } | null;
}

@Injectable({
    providedIn: 'root'
})
export class UnavailabilityService {
    private readonly storageKey = 'nightshift_unavailability_center_v1';
    private readonly webMediaTypeId = 3;
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

    getEntriesForOrganization(organizationId: number): UnavailabilityEntry[] {
        return this.getEntries().filter((entry) => entry.organizationId === organizationId);
    }

    getManagerInbox(organizationId?: number | null): UnavailabilityEntry[] {
        return this.getEntries().filter(
            (entry) =>
                entry.flow === 'operator_to_manager' &&
                entry.status === 'pending' &&
                (!organizationId || entry.organizationId === organizationId)
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
            organizationId: input.organizationId ?? null,
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
            serviceId: null,
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
            organizationId: input.organizationId ?? null,
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
            serviceId: null,
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

    importManagerNotifications(notifications: ScheduledNotificationDTO[], organizationId?: number | null): void {
        const entries = this.removeManagerOperatorRequestEntries(this.readEntries(), organizationId);
        let changed = false;

        notifications
            .filter((notification) => notification.state === 1 || notification.state === 3)
            .filter((notification) => this.isManagedUnavailabilityNotification(notification))
            .forEach((notification) => {
                const id = this.buildNotificationEntryId(notification);
                const existingIndex = entries.findIndex((entry) => entry.id === id);
                const matchingLocalIndex =
                    existingIndex < 0
                        ? this.findMatchingLocalRequestIndex(entries, notification)
                        : -1;
                const createdAtIso = this.normalizeIso(notification.created) ?? new Date().toISOString();
                const range = this.deriveRangeFromNotification(notification, createdAtIso);

                const baseEntry: UnavailabilityEntry = {
                    id,
                    userId: this.getNotificationSenderUserId(notification) ?? 0,
                    userName:
                        notification.nameUserSender?.trim() ||
                        notification.nameUser?.trim() ||
                        'Operatore',
                    organizationId: organizationId ?? notification.idcustomer ?? notification.idcompany ?? null,
                    createdByUserId: this.getNotificationSenderUserId(notification) ?? 0,
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
                    status: this.getOperatorNotificationStatus(notification),
                    startDateIso: range.startDateIso,
                    endDateIso: range.endDateIso,
                    reason: this.extractNotificationReason(notification),
                    managerNote: existingIndex >= 0 ? entries[existingIndex].managerNote : null,
                    shiftId: notification.idShift ?? null,
                    serviceId: notification.idService ?? null,
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
                        status: baseEntry.status,
                        managerNote: entries[existingIndex].managerNote
                    };
                } else if (matchingLocalIndex >= 0) {
                    entries[matchingLocalIndex] = {
                        ...entries[matchingLocalIndex],
                        notificationId: notification.id ?? entries[matchingLocalIndex].notificationId,
                        shiftId: notification.idShift ?? entries[matchingLocalIndex].shiftId,
                        serviceId: notification.idService ?? entries[matchingLocalIndex].serviceId,
                        serviceName:
                            notification.nameService?.trim() ||
                            notification.nameClient?.trim() ||
                            entries[matchingLocalIndex].serviceName,
                        roleName: notification.nameServiceType?.trim() || entries[matchingLocalIndex].roleName,
                        organizationId: organizationId ?? notification.idcustomer ?? notification.idcompany ?? entries[matchingLocalIndex].organizationId,
                        status: baseEntry.status,
                        source: 'notification',
                        syncStatus: 'synced',
                        updatedAtIso: new Date().toISOString()
                    };
                } else {
                    entries.push(baseEntry);
                }

                changed = true;
            });

        if (changed || entries.length !== this.readEntries().length) {
            this.writeEntries(entries);
        }
    }

    importOperatorNotifications(
        notifications: ScheduledNotificationDTO[],
        userId: number,
        organizationId?: number | null,
        _userName?: string | null,
        userEmail?: string | null
    ): UnavailabilityEntry[] {
        this.writeEntries(this.removeOperatorNotificationEntries(
            this.readEntries(),
            userId,
            organizationId
        ));

        const entries = new Map<string, UnavailabilityEntry>();

        for (let notification of notifications) {
            if (notification.idmediaType !== this.webMediaTypeId)
                continue;

            if (notification.state !== 1 && notification.state !== 3)
                continue;

            if (!this.isManagedUnavailabilityNotification(notification))
                continue;   

            // if (!this.isOperatorNotificationOwner(notification, userId, _userName, userEmail))
            //     continue;

            // if (!this.matchesSelectedOrganization(notification, organizationId))
            //     continue;


            const id = this.buildNotificationEntryId(notification);
            const createdAtIso = this.normalizeIso(notification.created) ?? new Date().toISOString();
            const range = this.deriveRangeFromNotification(notification, createdAtIso);
            const userName =
                notification.nameUserSender?.trim() ||
                notification.nameUser?.trim() ||
                'Operatore';

            const baseEntry: UnavailabilityEntry = {
                id,
                userId,
                userName,
                organizationId: organizationId ?? notification.idcustomer ?? notification.idcompany ?? null,
                createdByUserId: userId,
                createdByName: userName,
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
                status: this.getOperatorNotificationStatus(notification),
                startDateIso: range.startDateIso,
                endDateIso: range.endDateIso,
                reason: this.extractNotificationReason(notification),
                managerNote: null,
                shiftId: notification.idShift ?? null,
                serviceId: notification.idService ?? null,
                serviceName: notification.nameService?.trim() || notification.nameClient?.trim() || null,
                roleName: notification.nameServiceType?.trim() || null,
                source: 'notification',
                notificationId: notification.id ?? null,
                syncStatus: 'synced',
                createdAtIso,
                updatedAtIso: new Date().toISOString()
            };

            entries.set(id, baseEntry);
        };

        return this.dedupeOperatorNotificationEntries(Array.from(entries.values()));
    }

    importRejectedOperatorNotifications(
        notifications: ScheduledNotificationDTO[],
        userId: number,
        organizationId?: number | null
    ): UnavailabilityEntry[] {
        return this.dedupeOperatorNotificationEntries(
            notifications
                .filter((notification) => notification.idmediaType === this.webMediaTypeId)
                .filter((notification) => notification.state === 1)
                .filter((notification) => this.isRejectedOutcomeNotification(notification))
                .map((notification) => {
                    const createdAtIso = this.normalizeIso(notification.created) ?? new Date().toISOString();
                    const range = this.deriveRangeFromNotification(notification, createdAtIso);

                    return {
                        id: this.buildNotificationEntryId(notification),
                        userId,
                        userName:
                            notification.nameUser?.trim() ||
                            notification.nameUserSender?.trim() ||
                            'Operatore',
                        organizationId: organizationId ?? notification.idcustomer ?? notification.idcompany ?? null,
                        createdByUserId: userId,
                        createdByName:
                            notification.nameUser?.trim() ||
                            notification.nameUserSender?.trim() ||
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
                        status: 'rejected',
                        startDateIso: range.startDateIso,
                        endDateIso: range.endDateIso,
                        reason: this.extractNotificationReason(notification),
                        managerNote: notification.field2?.trim() || null,
                        shiftId: notification.idShift ?? null,
                        serviceId: notification.idService ?? null,
                        serviceName: notification.nameService?.trim() || notification.nameClient?.trim() || null,
                        roleName: notification.nameServiceType?.trim() || null,
                        source: 'notification',
                        notificationId: notification.id ?? null,
                        syncStatus: 'synced',
                        createdAtIso,
                        updatedAtIso: new Date().toISOString()
                    } satisfies UnavailabilityEntry;
                })
        );
    }

    private isManagedUnavailabilityNotification(notification: ScheduledNotificationDTO): boolean {
        const marker = (notification.field4 ?? '').trim();
        if (this.managedNotificationMarkers.has(marker)) return true;

        const searchableText = [
            notification.title,
            notification.nameScheduleTask,
            notification.field1,
            notification.field2,
            notification.field3
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return searchableText.includes('richiesta indispon')
            || searchableText.includes('richiesta defez')
            || searchableText.includes('unavailability request')
            || searchableText.includes('defection request');
    }

    private getOperatorNotificationStatus(
        notification: ScheduledNotificationDTO
    ): UnavailabilityStatus {
        const outcomeText = [
            notification.title,
            notification.nameScheduleTask,
            notification.field1,
            notification.field2,
            notification.field3
        ]
            .filter(Boolean)
            .map((value) => this.normalizeText(value))
            .join(' ');

        if (outcomeText.includes('rifiut')) return 'rejected';
        if (outcomeText.includes('approvat') || outcomeText.includes('accettat')) return 'approved';

        return notification.state === 3 ? 'approved' : 'pending';
    }

    private isRejectedOutcomeNotification(notification: ScheduledNotificationDTO): boolean {
        return this.normalizeText(notification.field2).includes('richiesta rifiutata dal manager');
    }

    private normalizeText(value?: string | null): string {
        return (value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    private isOperatorNotificationOwner(
        notification: ScheduledNotificationDTO,
        userId: number,
        userName?: string | null,
        userEmail?: string | null
    ): boolean {
        if (this.getNotificationSenderUserId(notification) === userId) {
            return true;
        }

        const normalizedUserEmail = (userEmail ?? '').trim().toLowerCase();
        const normalizedNotificationEmail = (notification.userEmail ?? '').trim().toLowerCase();
        if (normalizedUserEmail && normalizedNotificationEmail === normalizedUserEmail) {
            return true;
        }

        const userNameTokens = this.normalizeNameTokens(userName);
        if (userNameTokens.length === 0) return false;

        const candidates = [
            notification.nameUserSender,
            notification.nameUser,
            notification.nameEmployee,
            notification.field1
        ];

        return candidates.some((candidate) => {
            const candidateTokens = this.normalizeNameTokens(candidate);
            return userNameTokens.every((token) => candidateTokens.includes(token));
        });
    }

    private normalizeNameTokens(value?: string | null): string[] {
        return (value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .map((token) => token.trim())
            .filter((token) => token.length > 1);
    }

    private dedupeOperatorNotificationEntries(entries: UnavailabilityEntry[]): UnavailabilityEntry[] {
        const byKey = new Map<string, UnavailabilityEntry>();
        const passthrough: UnavailabilityEntry[] = [];

        entries.forEach((entry) => {
            if (
                entry.source !== 'notification' ||
                entry.flow !== 'operator_to_manager' ||
                entry.status !== 'pending'
            ) {
                passthrough.push(entry);
                return;
            }

            const key = [
                entry.userId,
                entry.organizationId ?? 'org',
                entry.startDateIso,
                entry.endDateIso,
                entry.type,
                entry.reason.trim().toLowerCase()
            ].join('|');
            const current = byKey.get(key);

            if (!current || this.getNotificationEntryRank(entry) > this.getNotificationEntryRank(current)) {
                byKey.set(key, entry);
            }
        });

        return [...passthrough, ...byKey.values()];
    }

    private removeOperatorNotificationEntries(
        entries: UnavailabilityEntry[],
        userId: number,
        organizationId?: number | null
    ): UnavailabilityEntry[] {
        return entries.filter((entry) => {
            if (entry.source !== 'notification') return true;
            if (entry.flow !== 'operator_to_manager') return true;
            if (entry.userId !== userId) return true;
            if (organizationId && entry.organizationId && entry.organizationId !== organizationId) return true;
            return false;
        });
    }

    private removeManagerOperatorRequestEntries(
        entries: UnavailabilityEntry[],
        organizationId?: number | null
    ): UnavailabilityEntry[] {
        return entries.filter((entry) => {
            if (entry.flow !== 'operator_to_manager') return true;
            if (organizationId && entry.organizationId && entry.organizationId !== organizationId) return true;
            return false;
        });
    }

    private getNotificationEntryRank(entry: UnavailabilityEntry): number {
        if (entry.id.startsWith('notification-task-')) return 3;
        if (entry.notificationId !== null && entry.notificationId !== undefined) return 2;
        return 1;
    }

    private findMatchingLocalRequestIndex(
        entries: UnavailabilityEntry[],
        notification: ScheduledNotificationDTO
    ): number {
        const notificationUserId = this.getNotificationSenderUserId(notification) ?? 0;
        const notificationShiftId = notification.idShift ?? null;
        const normalizedNotificationStart = this.normalizeIso(this.getNotificationStartDate(notification));
        const normalizedNotificationEnd = this.normalizeIso(this.getNotificationStopDate(notification));

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

    private buildNotificationEntryId(notification: ScheduledNotificationDTO): string {
        const taskId = notification.idscheduleTask ?? this.getNotificationTask(notification)?.id ?? null;
        if (taskId) {
            return `notification-task-${taskId}`;
        }

        return `notification-${notification.id ?? 'na'}`;
    }

    private matchesSelectedOrganization(
        notification: ScheduledNotificationDTO,
        organizationId?: number | null
    ): boolean {
        if (!organizationId) return true;

        const candidates = [
            notification.idcustomer,
            notification.idcompany
        ].filter((value): value is number => value !== null && value !== undefined);

        return candidates.length === 0 || candidates.includes(organizationId);
    }

    private getNotificationSenderUserId(notification: ScheduledNotificationDTO): number | null {
        return notification.idUserSender ??
            this.getNotificationTask(notification)?.idUserSender ??
            notification.iduser ??
            null;
    }

    private getNotificationStartDate(notification: ScheduledNotificationDTO): string | null {
        return notification.startDate ?? this.getNotificationTask(notification)?.startDate ?? null;
    }

    private getNotificationStopDate(notification: ScheduledNotificationDTO): string | null {
        return notification.stopDate ?? this.getNotificationTask(notification)?.stopDate ?? null;
    }

    private getNotificationTask(
        notification: ScheduledNotificationDTO
    ): ScheduledNotificationWithTask['idscheduleTaskNavigation'] {
        return (notification as ScheduledNotificationWithTask).idscheduleTaskNavigation ?? null;
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
        const textRange = this.extractDateRangeFromNotificationText(notification);
        if (textRange) {
            return textRange;
        }

        const explicitStart = this.normalizeIso(this.getNotificationStartDate(notification));
        const explicitEnd = this.normalizeIso(this.getNotificationStopDate(notification));
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

    private extractDateRangeFromNotificationText(notification: ScheduledNotificationDTO): { startDateIso: string; endDateIso: string } | null {
        const text = [
            notification.title,
            notification.field1,
            notification.field2,
            notification.field3
        ]
            .filter((value): value is string => !!value)
            .join(' ');

        const rangeMatch = text.match(/\bdal\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(?:al|a)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
        if (rangeMatch) {
            return this.buildLocalDayRange(rangeMatch[1], rangeMatch[2]);
        }

        const singleDayMatch = text.match(/\b(?:giorno|del)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
        if (singleDayMatch) {
            return this.buildLocalDayRange(singleDayMatch[1], singleDayMatch[1]);
        }

        return null;
    }

    private buildLocalDayRange(startValue: string, endValue: string): { startDateIso: string; endDateIso: string } | null {
        const start = this.parseItalianLocalDate(startValue);
        const end = this.parseItalianLocalDate(endValue);
        if (!start || !end) {
            return null;
        }

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (start.getTime() > end.getTime()) {
            end.setTime(start.getTime());
            end.setHours(23, 59, 59, 999);
        }

        return {
            startDateIso: start.toISOString(),
            endDateIso: end.toISOString()
        };
    }

    private parseItalianLocalDate(value: string): Date | null {
        const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) {
            return null;
        }

        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);
        const date = new Date(year, month - 1, day);

        if (
            Number.isNaN(date.getTime()) ||
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        return date;
    }
}
