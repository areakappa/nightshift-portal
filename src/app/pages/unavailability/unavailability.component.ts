import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
import { AuthenticateUser } from '../../models/authenticateUser';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { UserDto } from '../../models/dto/userDto';
import { AuthenticationService } from '../../services/authentication.service';
import { OrganizationService } from '../../services/organization.service';
import { RoleService } from '../../services/role.service';
import { ScheduleService } from '../../services/schedule.service';
import { ServicesService } from '../../services/services.service';
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
    services: ServiceDTO[] = [];
    selectedServiceId: number | null = null;
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
        private servicesService: ServicesService,
        private unavailabilityService: UnavailabilityService,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadPage();
    }

    get visibleEntries(): UnavailabilityEntry[] {
        const user = this.authentication.getUser();
        if (!user) return [];
        if (this.mode === 'manager') {
            const teamUserIds = this.getTeamUserIds();
            return this.entries.filter(entry => entry.userId !== user.id && teamUserIds.has(entry.userId));
        }
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
        if (!startDateIso || !endDateIso || new Date(startDateIso).getTime() > new Date(endDateIso).getTime()) {
            this.snackBar.open('Intervallo date non valido.', 'Chiudi', { duration: 2000 });
            return;
        }

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
        await this.handleDecision(entry, true);
    }

    async reject(entry: UnavailabilityEntry): Promise<void> {
        await this.handleDecision(entry, false);
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

    async onServiceSelected(): Promise<void> {
        if (!this.selectedServiceId) {
            this.users = [];
            this.draft.targetUserId = null;
            return;
        }

        this.authentication.saveSelectedServiceId(this.selectedServiceId);
        await this.loadTeamUsers(this.selectedServiceId);
        this.cdr.detectChanges();
    }

    private async loadPage(): Promise<void> {
        this.isLoading = true;
        try {
            const user = this.authentication.getUser();
            if (!user?.id) return;
            this.mode = this.resolvePageMode(user);
            const orgId = this.organizationService.getOrganizationSelectedId();
            if (this.mode === 'manager' && orgId) {
                this.services = await this.servicesService.getServicesbyIDOrganization(orgId);
                const preferredServiceId = this.authentication.getSelectedServiceId();
                this.selectedServiceId = preferredServiceId && this.services.some(service => service.id === preferredServiceId)
                    ? preferredServiceId
                    : this.services[0]?.id ?? null;
                if (this.selectedServiceId) {
                    await this.loadTeamUsers(this.selectedServiceId);
                } else {
                    this.users = [];
                }
            } else {
                this.services = [];
                this.selectedServiceId = null;
                this.users = [];
            }

            if (this.mode === 'manager') {
                const notifications = await this.scheduleService.getScheduledNotificationsByIDUser(user.id).catch(() => []);
                this.unavailabilityService.importManagerNotifications(notifications);
            }
            this.entries = this.unavailabilityService.getEntries();
            if (this.mode === 'manager' && this.users.length > 0 && !this.draft.targetUserId) {
                this.draft.targetUserId = this.users[0].id;
            }
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    private async handleDecision(entry: UnavailabilityEntry, approved: boolean): Promise<void> {
        try {
            if (this.mode !== 'manager' || !this.canManageEntry(entry)) {
                this.snackBar.open(
                    'Puoi gestire solo le indisponibilità degli altri utenti del team selezionato.',
                    'Chiudi',
                    { duration: 3500 }
                );
                return;
            }

            let effectiveEntry = entry;

            if (!effectiveEntry.notificationId && effectiveEntry.flow === 'operator_to_manager') {
                const user = this.authentication.getUser();
                if (!user?.id) throw new Error('Utente non autenticato');

                const notifications = await this.scheduleService.getScheduledNotificationsByIDUser(user.id).catch(() => []);
                this.unavailabilityService.importManagerNotifications(notifications);
                this.entries = this.unavailabilityService.getEntries();

                effectiveEntry =
                    this.entries.find(item => item.id === entry.id) ??
                    this.entries.find(item =>
                        item.flow === entry.flow &&
                        item.userId === entry.userId &&
                        item.shiftId === entry.shiftId &&
                        item.startDateIso === entry.startDateIso &&
                        item.endDateIso === entry.endDateIso
                    ) ??
                    entry;
            }

            if (effectiveEntry.flow === 'operator_to_manager' && !effectiveEntry.notificationId) {
                this.snackBar.open(
                    'Richiesta non ancora sincronizzata col backend. Riprova tra pochi secondi.',
                    'Chiudi',
                    { duration: 3500 }
                );
                return;
            }

            if (!this.canManageEntry(effectiveEntry)) {
                throw new Error('La richiesta non appartiene al team selezionato');
            }

            if (effectiveEntry.notificationId) {
                const decisionApplied = await this.scheduleService.handleOperatorUnavailabilityDecision({
                    idNotification: effectiveEntry.notificationId,
                    approved
                });
                if (!decisionApplied) throw new Error('Decisione non applicata dal backend');
            }

            this.unavailabilityService.decideEntry(effectiveEntry.id, approved ? 'approved' : 'rejected', '');
            this.snackBar.open(approved ? 'Approvata.' : 'Rifiutata.', 'Ok', { duration: 2000 });
            await this.loadPage();
        } catch (error) {
            console.error('handleDecision() ERROR:: ', error);
            this.snackBar.open('Non sono riuscito a salvare la decisione.', 'Chiudi', { duration: 3000 });
        }
    }

    private resolvePageMode(user: AuthenticateUser): PageMode {
        const selectedRole = this.roleService.getRoleSnapshot();
        const hasManagerPrivileges = !!user?.isCustomerAdmin || !!user?.isAdmin;

        if (selectedRole === 'operator') return 'operator';
        if (selectedRole === 'organizer' && hasManagerPrivileges) return 'manager';
        return !!user?.isUser && !user?.isCustomerAdmin ? 'operator' : 'manager';
    }

    private isDraftValid(): boolean {
        return !!this.draft.startDate && !!this.draft.endDate && this.draft.reason.trim().length >= 3 &&
            (this.mode === 'operator' || !!this.draft.targetUserId);
    }

    private toDayStartIso(value: string): string | null {
        if (!value) return null;
        const date = this.parseLocalDate(value);
        if (!date) return null;
        date.setHours(0, 0, 0, 0);
        return date.toISOString();
    }

    private toDayEndIso(value: string): string | null {
        if (!value) return null;
        const date = this.parseLocalDate(value);
        if (!date) return null;
        date.setHours(23, 59, 59, 999);
        return date.toISOString();
    }

    private buildCurrentUserName(): string {
        const u = this.authentication.getUser();
        return `${u?.name ?? ''} ${u?.surname ?? ''}`.trim() || u?.username || 'Utente';
    }

    private buildEmptyDraft(): UnavailabilityDraft {
        const today = this.formatLocalDateInput(new Date());
        return { targetUserId: null, type: 'vacation', startDate: today, endDate: today, reason: '' };
    }

    private parseLocalDate(value: string): Date | null {
        const parts = value.split('-').map(segment => Number(segment));
        if (parts.length !== 3 || parts.some(segment => !Number.isFinite(segment))) return null;

        const [year, month, day] = parts;
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

    private formatLocalDateInput(date: Date): string {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private async loadTeamUsers(serviceId: number): Promise<void> {
        const currentUserId = this.authentication.getUser()?.id;
        this.users = (await this.organizationService.getUsersbyService(serviceId))
            .filter(user => user.id !== null && user.state !== 0 && user.id !== currentUserId);

        if (!this.users.some(user => user.id === this.draft.targetUserId)) {
            this.draft.targetUserId = this.users[0]?.id ?? null;
        }
    }

    private getTeamUserIds(): Set<number> {
        return new Set(
            this.users
                .map(user => user.id)
                .filter((id): id is number => id !== null)
        );
    }

    private canManageEntry(entry: UnavailabilityEntry): boolean {
        const currentUserId = this.authentication.getUser()?.id;
        return entry.flow === 'operator_to_manager'
            && entry.userId !== currentUserId
            && this.getTeamUserIds().has(entry.userId);
    }
}
