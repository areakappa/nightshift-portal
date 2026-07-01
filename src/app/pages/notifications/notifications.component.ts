import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { ScheduledNotificationDTO } from '../../models/dto/ScheduledNotificationDTO';
import { ScheduleService } from '../../services/schedule.service';
import { AuthenticationService } from '../../services/authentication.service';
import { RoleService } from '../../services/role.service';

interface ScheduledNotificationWithTask extends ScheduledNotificationDTO {
    idscheduleTaskNavigation?: {
        idUserSender?: number | null;
        startDate?: string | null;
        stopDate?: string | null;
    } | null;
}

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [
        CommonModule, MatCardModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatSnackBarModule, MatListModule, MatBadgeModule
    ],
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
    private readonly manageableUnavailabilityMarkers = new Set([
        'OPERATOR_UNAVAILABILITY_REQUEST'
    ]);

    notifications: ScheduledNotificationDTO[] = [];
    selectedNotification: ScheduledNotificationDTO | null = null;
    notificationView: 'received' | 'sent' = 'received';
    isLoading = false;
    decisionNotificationId: number | null = null;

    constructor(
        private scheduleService: ScheduleService,
        private authService: AuthenticationService,
        private roleService: RoleService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadNotifications();
    }

    async loadNotifications(): Promise<void> {
        const user = this.authService.getUser();
        if (!user) return;
        this.isLoading = true;
        try {
            const userNotifications = await this.scheduleService.getScheduledNotificationsByIDUser(user.id);
            const customerNotifications = this.isManager()
                ? await this.scheduleService.getScheduledNotificationsByIDCustomer().catch(() => [])
                : [];

            this.notifications = this.mergeNotifications(userNotifications, customerNotifications)
                .filter(notification => notification.idmediaType == 3)
                .sort((left, right) => this.getNotificationTimestamp(right) - this.getNotificationTimestamp(left));
            this.selectedNotification = this.selectedNotification
                ? this.visibleNotifications.find(notification => notification.id === this.selectedNotification?.id) ?? null
                : null;
        } catch {
            this.snackBar.open('Errore nel caricamento notifiche', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    async approveNotification(notification: ScheduledNotificationDTO): Promise<void> {
        if (!this.canDecide(notification)) return;
        this.decisionNotificationId = notification.id ?? null;
        try {
            const openGenerationPreview = window.confirm(
                "Richiesta approvata. Vuoi aprire subito l'anteprima di rigenerazione turni?"
            );
            const applied = await this.scheduleService.handleOperatorUnavailabilityDecision({
                idNotification: notification.id ?? 0,
                approved: true,
                regenerateShifts: false
            });
            if (!applied) throw new Error('Decisione non applicata');
            this.snackBar.open('Indisponibilita confermata', 'Ok', { duration: 2000 });
            if (openGenerationPreview) {
                await this.openRegenerationPreview(notification);
                return;
            }
            await this.loadNotifications();
        } catch {
            this.snackBar.open('Non sono riuscito a confermare la richiesta', 'Chiudi', { duration: 3000 });
        } finally {
            this.decisionNotificationId = null;
        }
    }

    async rejectNotification(notification: ScheduledNotificationDTO): Promise<void> {
        if (!this.canDecide(notification)) return;
        this.decisionNotificationId = notification.id ?? null;
        try {
            const applied = await this.scheduleService.handleOperatorUnavailabilityDecision({
                idNotification: notification.id ?? 0,
                approved: false,
                regenerateShifts: false
            });
            if (!applied) throw new Error('Decisione non applicata');
            this.snackBar.open('Indisponibilita rifiutata', 'Ok', { duration: 2000 });
            await this.loadNotifications();
        } catch {
            this.snackBar.open('Non sono riuscito a rifiutare la richiesta', 'Chiudi', { duration: 3000 });
        } finally {
            this.decisionNotificationId = null;
        }
    }

    openNotification(notification: ScheduledNotificationDTO): void {
        this.selectedNotification = notification;
    }

    closeNotification(): void {
        this.selectedNotification = null;
    }

    setNotificationView(view: 'received' | 'sent'): void {
        this.notificationView = view;
        this.selectedNotification = null;
    }

    get isManagerView(): boolean {
        return this.isManager();
    }

    get receivedNotifications(): ScheduledNotificationDTO[] {
        return this.notifications.filter(notification => !this.isSentByCurrentUser(notification));
    }

    get sentNotifications(): ScheduledNotificationDTO[] {
        return this.notifications.filter(notification => this.isSentByCurrentUser(notification));
    }

    get visibleNotifications(): ScheduledNotificationDTO[] {
        if (!this.isManagerView) return this.notifications;
        return this.notificationView === 'sent' ? this.sentNotifications : this.receivedNotifications;
    }

    isUnavailabilityNotification(notification: ScheduledNotificationDTO): boolean {
        const marker = (notification.field4 ?? '').trim();
        if (this.manageableUnavailabilityMarkers.has(marker)) return true;

        const type = [
            notification.title,
            notification.nameScheduleTask,
            notification.field4
        ].join(' ').toLowerCase();

        return type.includes('richiesta indispon') || type.includes('unavailability request');
    }

    canDecide(notification: ScheduledNotificationDTO): boolean {
        return this.isManager()
            && this.isUnavailabilityNotification(notification)
            && (notification.state === 0 || notification.state === 1)
            && !!notification.id;
    }

    isDeciding(notification: ScheduledNotificationDTO): boolean {
        return !!notification.id && this.decisionNotificationId === notification.id;
    }

    getNotificationIcon(notification: ScheduledNotificationDTO): string {
        const type = `${notification.title ?? ''} ${notification.nameScheduleTask ?? ''}`.toLowerCase();
        if (type.includes('indispon') || type.includes('unavailab')) return 'event_busy';
        if (type.includes('turno') || type.includes('shift')) return 'calendar_month';
        return 'notifications';
    }

    getSenderName(notification: ScheduledNotificationDTO): string {
        return notification.nameUserSender?.trim()
            || notification.nameEmployee?.trim()
            || notification.nameUser?.trim()
            || 'NightShift';
    }

    getSenderInitials(notification: ScheduledNotificationDTO): string {
        const parts = this.getSenderName(notification).split(/\s+/).filter(Boolean);
        return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('') || 'NS';
    }

    getStatusLabel(notification: ScheduledNotificationDTO): string {
        if (notification.state === 0 && this.isUnavailabilityNotification(notification)) return 'Da gestire';
        if (notification.state === 0) return 'Notifica';
        if (notification.state === 1 && this.isUnavailabilityNotification(notification)) return 'Da gestire';
        if (notification.state === 1) return 'Attiva';
        return 'Archiviata';
    }

    getServiceLabel(notification: ScheduledNotificationDTO): string {
        return notification.nameService?.trim()
            || notification.nameServiceType?.trim()
            || notification.nameClient?.trim()
            || 'Aggiornamento operativo';
    }

    getOrganizationLabel(notification: ScheduledNotificationDTO): string | null {
        const service = this.getServiceLabel(notification);
        const organization = notification.nameClient?.trim();
        return organization && organization !== service ? organization : null;
    }

    hasShiftRange(notification: ScheduledNotificationDTO): boolean {
        return !!notification.startDate;
    }

    getNotificationDetails(notification: ScheduledNotificationDTO): string[] {
        return [notification.field1, notification.field2, notification.field3]
            .map(value => value?.trim())
            .filter((value): value is string => !!value);
    }

    formatNotificationCreated(notification: ScheduledNotificationDTO): string {
        const date = this.parseUtcDate(notification.created);
        if (!date) return '';

        return new Intl.DateTimeFormat('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    private getNotificationTimestamp(notification: ScheduledNotificationDTO): number {
        const created = this.parseUtcDate(notification.created);
        if (created) return created.getTime();

        const timestamp = notification.startDate ? new Date(notification.startDate).getTime() : 0;
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    private parseUtcDate(value: string | null | undefined): Date | null {
        if (!value) return null;

        const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
        const normalizedValue = hasTimezone ? value : `${value}Z`;
        const date = new Date(normalizedValue);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    private mergeNotifications(...groups: ScheduledNotificationDTO[][]): ScheduledNotificationDTO[] {
        const merged = new Map<string, ScheduledNotificationDTO>();

        groups.flat().forEach((notification, index) => {
            const key = notification.id ? `id-${notification.id}` : `local-${index}`;
            merged.set(key, notification);
        });

        return Array.from(merged.values());
    }

    private isManager(): boolean {
        const user = this.authService.getUser();
        return !!user?.isAdmin || !!user?.isCustomerAdmin || this.roleService.getRoleSnapshot() === 'organizer';
    }

    private isSentByCurrentUser(notification: ScheduledNotificationDTO): boolean {
        const currentUserId = this.authService.getUser()?.id;
        if (!currentUserId) return false;

        return this.getNotificationSenderUserId(notification) === currentUserId;
    }

    private async openRegenerationPreview(notification: ScheduledNotificationDTO): Promise<void> {
        if (!notification.idService) {
            this.snackBar.open('Richiesta approvata. Servizio non disponibile per generare la preview.', 'Chiudi', { duration: 3500 });
            await this.loadNotifications();
            return;
        }

        const range = this.deriveNotificationRange(notification);
        await this.router.navigate(['/service-schedule'], {
            state: {
                service: {
                    id: notification.idService,
                    name: notification.nameService ?? notification.nameClient ?? 'Servizio'
                },
                unavailabilityRegenerationPreview: {
                    autoGeneratePreview: true,
                    serviceId: notification.idService,
                    startDateIso: range.startDateIso,
                    endDateIso: range.endDateIso,
                    excludedUserIds: [this.getNotificationSenderUserId(notification)].filter((id): id is number => !!id),
                    backHref: '/notifications'
                }
            }
        });
    }

    private deriveNotificationRange(notification: ScheduledNotificationDTO): { startDateIso: string; endDateIso: string } {
        const textRange = this.extractDateRangeFromNotificationText(notification);
        if (textRange) return textRange;

        const task = this.getNotificationTask(notification);
        const explicitStart = notification.startDate ? new Date(notification.startDate) : task?.startDate ? new Date(task.startDate) : null;
        const explicitEnd = notification.stopDate ? new Date(notification.stopDate) : task?.stopDate ? new Date(task.stopDate) : null;
        if (explicitStart && explicitEnd && !isNaN(explicitStart.getTime()) && !isNaN(explicitEnd.getTime())) {
            return {
                startDateIso: explicitStart.toISOString(),
                endDateIso: explicitEnd.toISOString()
            };
        }

        const fallback = notification.created ? new Date(notification.created) : new Date();
        fallback.setHours(0, 0, 0, 0);
        const end = new Date(fallback);
        end.setHours(23, 59, 59, 999);
        return {
            startDateIso: fallback.toISOString(),
            endDateIso: end.toISOString()
        };
    }

    private extractDateRangeFromNotificationText(notification: ScheduledNotificationDTO): { startDateIso: string; endDateIso: string } | null {
        const text = [notification.title, notification.field1, notification.field2, notification.field3]
            .filter((value): value is string => !!value)
            .join(' ');

        const rangeMatch = text.match(/\bdal\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(?:al|a)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
        if (rangeMatch) return this.buildLocalDayRange(rangeMatch[1], rangeMatch[2]);

        const singleDayMatch = text.match(/\b(?:giorno|del)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
        if (singleDayMatch) return this.buildLocalDayRange(singleDayMatch[1], singleDayMatch[1]);

        return null;
    }

    private buildLocalDayRange(startValue: string, endValue: string): { startDateIso: string; endDateIso: string } | null {
        const start = this.parseItalianDate(startValue);
        const end = this.parseItalianDate(endValue);
        if (!start || !end) return null;

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        if (start > end) {
            end.setTime(start.getTime());
            end.setHours(23, 59, 59, 999);
        }

        return {
            startDateIso: start.toISOString(),
            endDateIso: end.toISOString()
        };
    }

    private parseItalianDate(value: string): Date | null {
        const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) return null;

        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
            ? date
            : null;
    }

    private getNotificationSenderUserId(notification: ScheduledNotificationDTO): number | null {
        return notification.idUserSender ?? this.getNotificationTask(notification)?.idUserSender ?? notification.iduser ?? null;
    }

    private getNotificationTask(notification: ScheduledNotificationDTO): ScheduledNotificationWithTask['idscheduleTaskNavigation'] {
        return (notification as ScheduledNotificationWithTask).idscheduleTaskNavigation ?? null;
    }
}
