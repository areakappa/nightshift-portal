import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { ShiftItemDTO } from '../../models/dto/ShiftItemDTO';
import { UnavailabilityEntry } from '../../models/generic/unavailability/UnavailabilityEntry';
import { ShiftsSearch } from '../../models/generic/Shift/ShiftsSearch';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { TeamCoverage } from '../../models/generic/team/TeamCoverage';
import { ScheduleService } from '../../services/schedule.service';
import { ServicesService } from '../../services/services.service';
import { OrganizationService } from '../../services/organization.service';
import { AuthenticationService } from '../../services/authentication.service';
import { RoleService, UserRole } from '../../services/role.service';
import { AccountContextService } from '../../services/account-context.service';
import { UnavailabilityService } from '../../services/unavailability.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule, MatCardModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatTabsModule, MatChipsModule, MatSnackBarModule, RouterModule
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
    isLoading = false;
    currentRole: UserRole = 'organizer';

    // Organizer data
    services: ServiceDTO[] = [];
    coverageMap = new Map<number, TeamCoverage>();
    totalCoveragePct = 0;

    // Operator data
    myShifts: ShiftItemDTO[] = [];
    myUnavailability: UnavailabilityEntry[] = [];
    selectedDate = new Date();

    constructor(
        private scheduleService: ScheduleService,
        private servicesService: ServicesService,
        private orgService: OrganizationService,
        private authService: AuthenticationService,
        private roleService: RoleService,
        private accountContextService: AccountContextService,
        private unavailabilityService: UnavailabilityService,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit(): Promise<void> {
        await this.accountContextService.refresh();
        this.currentRole = this.roleService.getRoleSnapshot();
        if (this.currentRole === 'organizer' && !this.accountContextService.snapshot.isManager) {
            this.currentRole = 'operator';
            this.roleService.setRole(this.currentRole);
        }
        await this.loadData();
    }

    async loadData(): Promise<void> {
        this.isLoading = true;
        try {
            if (this.currentRole === 'organizer') {
                await this.loadOrganizerData();
            } else {
                await this.loadOperatorData();
            }
        } catch {
            this.snackBar.open('Errore nel caricamento dashboard', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    private async loadOrganizerData(): Promise<void> {
        const orgId = this.orgService.getOrganizationSelectedId();
        if (!orgId) return;
        this.services = await this.servicesService.getServicesbyIDOrganization(orgId);
        this.coverageMap.clear();
        let covered = 0; let total = 0;
        for (const svc of this.services) {
            try {
                const cov = await this.servicesService.getTeamServiceRoles(svc.id);
                this.coverageMap.set(svc.id, cov);
                covered += cov?.totalRolesCoverage ?? 0;
                total += cov?.totalRoles ?? 0;
            } catch { }
        }
        this.totalCoveragePct = total > 0 ? Math.round((covered / total) * 100) : 100;
    }

    private async loadOperatorData(): Promise<void> {
        const user = this.authService.getUser();
        if (!user) return;
        const today = new Date();
        const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
        const search = new ShiftsSearch(
                null,
                this.scheduleService.getStringFromDate(today),
                this.scheduleService.getStringFromDate(weekEnd)
            );
        const allShifts = await this.scheduleService.getShiftsByService(search);
        this.myShifts = allShifts
            .filter(s => s.idUser === user.id || s.idEmployee === user.id)
            .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
        const orgId = this.orgService.getOrganizationSelectedId();
        const operatorNotifications = await this.scheduleService
            .getScheduledNotificationsByIDSender(user.id)
            .catch(() => []);
        const rejectedNotifications = await this.scheduleService
            .getScheduledNotificationsByIDUser(user.id)
            .catch(() => []);
        this.myUnavailability = this.unavailabilityService.importOperatorNotifications(
            operatorNotifications,
            user.id,
            orgId || null,
            `${user.name ?? ''} ${user.surname ?? ''}`.trim() || user.username,
            user.email ?? null
        ).concat(
            this.unavailabilityService.importRejectedOperatorNotifications(
                rejectedNotifications,
                user.id,
                orgId || null
            )
        );
    }

    switchRole(): void {
        if (this.organizerSwitchDisabled) return;

        const newRole: UserRole = this.currentRole === 'organizer' ? 'operator' : 'organizer';
        this.roleService.setRole(newRole);
        this.currentRole = newRole;
        void this.loadData();
    }

    get organizerSwitchDisabled(): boolean {
        return this.currentRole === 'operator' && !this.accountContextService.snapshot.isManager;
    }

    getCoverage(service: ServiceDTO): TeamCoverage | null { return this.coverageMap.get(service.id) ?? null; }
    getCoveragePct(service: ServiceDTO): number {
        const c = this.getCoverage(service);
        const t = c?.totalRoles ?? 0;
        return t > 0 ? Math.round(((c?.totalRolesCoverage ?? 0) / t) * 100) : 100;
    }

    get weekDays(): Date[] {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }

    get selectedDayShifts(): ShiftItemDTO[] {
        return this.myShifts.filter(shift => this.isSameDay(new Date(shift.startDateTime), this.selectedDate));
    }

    get nextShift(): ShiftItemDTO | null {
        const now = Date.now();
        return this.myShifts.find(shift => new Date(shift.endDateTime).getTime() >= now) ?? null;
    }

    get activeUnavailabilityCount(): number {
        return this.myUnavailability.filter(entry => entry.status === 'pending').length;
    }

    get conflictCount(): number {
        return this.myShifts.filter((shift, index, shifts) =>
            shifts.slice(index + 1).some(other =>
                new Date(shift.startDateTime).getTime() < new Date(other.endDateTime).getTime() &&
                new Date(other.startDateTime).getTime() < new Date(shift.endDateTime).getTime()
            )
        ).length;
    }

    selectDate(date: Date): void {
        this.selectedDate = new Date(date);
    }

    isSelectedDate(date: Date): boolean {
        return this.isSameDay(date, this.selectedDate);
    }

    private isSameDay(left: Date, right: Date): boolean {
        return left.getFullYear() === right.getFullYear()
            && left.getMonth() === right.getMonth()
            && left.getDate() === right.getDate();
    }
}
