import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    isLoading = false;
    decisionNotificationId: number | null = null;

    constructor(
        private scheduleService: ScheduleService,
        private authService: AuthenticationService,
        private roleService: RoleService,
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
                ? this.notifications.find(notification => notification.id === this.selectedNotification?.id) ?? null
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
            const applied = await this.scheduleService.handleOperatorUnavailabilityDecision({ idNotification: notification.id ?? 0, approved: true });
            if (!applied) throw new Error('Decisione non applicata');
            this.snackBar.open('Indisponibilita confermata', 'Ok', { duration: 2000 });
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
            const applied = await this.scheduleService.handleOperatorUnavailabilityDecision({ idNotification: notification.id ?? 0, approved: false });
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

    private getNotificationTimestamp(notification: ScheduledNotificationDTO): number {
        const value = notification.created ?? notification.startDate;
        const timestamp = value ? new Date(value).getTime() : 0;
        return Number.isNaN(timestamp) ? 0 : timestamp;
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
}
