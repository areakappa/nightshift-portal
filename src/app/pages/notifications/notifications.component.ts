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
    notifications: ScheduledNotificationDTO[] = [];
    isLoading = false;

    constructor(
        private scheduleService: ScheduleService,
        private authService: AuthenticationService,
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
            this.notifications = (await this.scheduleService.getScheduledNotificationsByIDUser(user.id))
                .sort((left, right) => this.getNotificationTimestamp(right) - this.getNotificationTimestamp(left));
                this.notifications  = this.notifications.filter(notification => notification.idmediaType == 3); // Mostra solo notifiche attive o da gestire
        } catch {
            this.snackBar.open('Errore nel caricamento notifiche', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    async approveNotification(notification: ScheduledNotificationDTO): Promise<void> {
        try {
            await this.scheduleService.handleOperatorUnavailabilityDecision({ idNotification: notification.id ?? 0, approved: true });
            this.snackBar.open('Approvato', 'Ok', { duration: 2000 });
            await this.loadNotifications();
        } catch {
            this.snackBar.open('Errore', 'Chiudi', { duration: 3000 });
        }
    }

    async rejectNotification(notification: ScheduledNotificationDTO): Promise<void> {
        try {
            await this.scheduleService.handleOperatorUnavailabilityDecision({ idNotification: notification.id ?? 0, approved: false });
            this.snackBar.open('Rifiutato', 'Ok', { duration: 2000 });
            await this.loadNotifications();
        } catch {
            this.snackBar.open('Errore', 'Chiudi', { duration: 3000 });
        }
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
        if (notification.state === 0) return 'Da gestire';
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

    private getNotificationTimestamp(notification: ScheduledNotificationDTO): number {
        const value = notification.created ?? notification.startDate;
        const timestamp = value ? new Date(value).getTime() : 0;
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }
}
