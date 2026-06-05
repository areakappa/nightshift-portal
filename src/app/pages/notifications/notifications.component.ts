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
            this.notifications = await this.scheduleService.getScheduledNotificationsByIDUser(user.id);
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
        const type = notification.nameScheduleTask?.toLowerCase() ?? '';
        if (type.includes('unavailab')) return 'event_busy';
        if (type.includes('shift')) return 'swap_horiz';
        return 'notifications';
    }
}
