import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { UnavailabilityEntry, UnavailabilityType } from '../../models/generic/unavailability/UnavailabilityEntry';
import { UserDto } from '../../models/dto/userDto';
import { AuthenticationService } from '../../services/authentication.service';
import { OrganizationService } from '../../services/organization.service';
import { RoleService } from '../../services/role.service';
import { ScheduleService } from '../../services/schedule.service';
import { UnavailabilityService } from '../../services/unavailability.service';

type PageMode = 'operator' | 'manager';

interface UnavailabilityDraft {
    targetUserId: number | null;
    type: UnavailabilityType;
    startDate: string;
    endDate: string;
    reason: string;
}

@Component({
    selector: 'app-unavailability',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
        MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule,
        MatChipsModule, MatSnackBarModule, MatDialogModule
    ],
    templateUrl: './unavailability.component.html',
    styleUrls: ['./unavailability.component.scss']
})
export class UnavailabilityComponent implements OnInit {
    mode: PageMode = 'operator';
    isLoading = false;
    users: UserDto[] = [];
    entries: UnavailabilityEntry[] = [];
    draft: UnavailabilityDraft = this.buildEmptyDraft();
    showForm = false;

    readonly typeOptions: Array<{ value: UnavailabilityType; label: string }> = [
        { value: 'vacation', label: 'Ferie' },
        { value: 'sick', label: 'Malattia' },
        { value: 'permission', label: 'Permesso' },
        { value: 'personal', label: 'Motivi personali' },
        { value: 'other', label: 'Altro' }
    ];

    constructor(
        private authentication: AuthenticationService,
        private organizationService: OrganizationService,
        private roleService: RoleService,
        private scheduleService: ScheduleService,
        private unavailabilityService: UnavailabilityService,
        private snackBar: MatSnackBar
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadPage();
    }

    get visibleEntries(): UnavailabilityEntry[] {
        const user = this.authentication.getUser();
        if (!user) return [];
        if (this.mode === 'manager') return this.entries;
        return this.entries.filter(e => e.userId === user.id);
    }

    get pendingEntries(): UnavailabilityEntry[] { return this.visibleEntries.filter(e => e.status === 'pending'); }
    get approvedEntries(): UnavailabilityEntry[] { return this.visibleEntries.filter(e => e.status === 'approved'); }
    get rejectedEntries(): UnavailabilityEntry[] { return this.visibleEntries.filter(e => e.status === 'rejected'); }

    async submitDraft(): Promise<void> {
        const user = this.authentication.getUser();
        if (!user?.id) { this.snackBar.open('Utente non disponibile.', 'Chiudi', { duration: 2000 }); return; }
        if (!this.isDraftValid()) { this.snackBar.open('Compila tutti i campi obbligatori.', 'Chiudi', { duration: 2000 }); return; }

        const startDateIso = this.toDayStartIso(this.draft.startDate);
        const endDateIso = this.toDayEndIso(this.draft.endDate);
        if (!startDateIso || !endDateIso) { this.snackBar.open('Date non valide.', 'Chiudi', { duration: 2000 }); return; }

        try {
            if (this.mode === 'manager') {
                const targetUser = this.users.find(u => u.id === this.draft.targetUserId);
                if (!targetUser) { this.snackBar.open('Seleziona un collaboratore.', 'Chiudi', { duration: 2000 }); return; }
                this.unavailabilityService.createManagerAssignment({
                    managerUserId: user.id, managerName: this.buildCurrentUserName(),
                    userId: targetUser.id!, userName: this.getUserLabel(targetUser),
                    startDateIso, endDateIso, type: this.draft.type, reason: this.draft.reason
                });
                this.snackBar.open('Indisponibilità assegnata.', 'Ok', { duration: 2000 });
            } else {
                const entry = await this.unavailabilityService.createOperatorRequest({
                    userId: user.id, userName: this.buildCurrentUserName(),
                    startDateIso, endDateIso, type: this.draft.type, reason: this.draft.reason, source: 'manual'
                });
                const msg = entry.syncStatus === 'synced' ? 'Richiesta inviata al manager.' : 'Richiesta salvata localmente.';
                this.snackBar.open(msg, 'Ok', { duration: 2000 });
            }
            this.draft = this.buildEmptyDraft();
            this.showForm = false;
            await this.loadPage();
        } catch {
            this.snackBar.open('Errore nel salvataggio.', 'Chiudi', { duration: 3000 });
        }
    }

    async approve(entry: UnavailabilityEntry): Promise<void> {
        if (entry.notificationId) {
            await this.scheduleService.handleOperatorUnavailabilityDecision({ idNotification: entry.notificationId, approved: true });
        }
        this.unavailabilityService.decideEntry(entry.id, 'approved', '');
        this.snackBar.open('Approvata.', 'Ok', { duration: 2000 });
        await this.loadPage();
    }

    async reject(entry: UnavailabilityEntry): Promise<void> {
        if (entry.notificationId) {
            await this.scheduleService.handleOperatorUnavailabilityDecision({ idNotification: entry.notificationId, approved: false });
        }
        this.unavailabilityService.decideEntry(entry.id, 'rejected', '');
        this.snackBar.open('Rifiutata.', 'Ok', { duration: 2000 });
        await this.loadPage();
    }

    getStatusLabel(status: UnavailabilityEntry['status']): string {
        if (status === 'approved') return 'Approvata';
        if (status === 'rejected') return 'Rifiutata';
        return 'In attesa';
    }

    getStatusClass(status: UnavailabilityEntry['status']): string {
        if (status === 'approved') return 'status-approved';
        if (status === 'rejected') return 'status-rejected';
        return 'status-pending';
    }

    getTypeLabel(type: UnavailabilityType): string {
        return this.typeOptions.find(o => o.value === type)?.label ?? 'Altro';
    }

    formatDateRange(entry: UnavailabilityEntry): string {
        const s = new Date(entry.startDateIso).toLocaleDateString('it-IT');
        const e = new Date(entry.endDateIso).toLocaleDateString('it-IT');
        return s === e ? s : `${s} - ${e}`;
    }

    getUserLabel(user: UserDto): string {
        return `${user.name ?? ''} ${user.surname ?? ''}`.trim() || user.email || 'Collaboratore';
    }

    private async loadPage(): Promise<void> {
        this.isLoading = true;
        try {
            const user = this.authentication.getUser();
            if (!user?.id) return;
            this.mode = this.resolvePageMode(user);
            const orgId = this.organizationService.getOrganizationSelectedId();
            if (this.mode === 'manager' && orgId) {
                this.users = (await this.organizationService.getUsersbyOrganization(orgId)).filter(u => u.id !== null && u.state !== 0);
                const notifications = await this.scheduleService.getScheduledNotificationsByIDUser(user.id).catch(() => []);
                this.unavailabilityService.importManagerNotifications(notifications);
            }
            this.entries = this.unavailabilityService.getEntries();
            if (this.mode === 'manager' && this.users.length > 0 && !this.draft.targetUserId) {
                this.draft.targetUserId = this.users[0].id;
            }
        } finally {
            this.isLoading = false;
        }
    }

    private resolvePageMode(user: any): PageMode {
        const role = this.roleService.getRoleSnapshot();
        if (role === 'operator') return 'operator';
        return (user?.isCustomerAdmin || user?.isAdmin) ? 'manager' : 'operator';
    }

    private isDraftValid(): boolean {
        return !!this.draft.startDate && !!this.draft.endDate && this.draft.reason.trim().length >= 3 &&
            (this.mode === 'operator' || !!this.draft.targetUserId);
    }

    private toDayStartIso(value: string): string | null {
        if (!value) return null;
        const d = new Date(value); d.setHours(0, 0, 0, 0); return isNaN(d.getTime()) ? null : d.toISOString();
    }

    private toDayEndIso(value: string): string | null {
        if (!value) return null;
        const d = new Date(value); d.setHours(23, 59, 59, 999); return isNaN(d.getTime()) ? null : d.toISOString();
    }

    private buildCurrentUserName(): string {
        const u = this.authentication.getUser();
        return `${u?.name ?? ''} ${u?.surname ?? ''}`.trim() || u?.username || 'Utente';
    }

    private buildEmptyDraft(): UnavailabilityDraft {
        const today = new Date().toISOString().split('T')[0];
        return { targetUserId: null, type: 'vacation', startDate: today, endDate: today, reason: '' };
    }
}
