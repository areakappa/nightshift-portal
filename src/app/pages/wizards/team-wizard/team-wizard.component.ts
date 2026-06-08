import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ServiceDTO } from '../../../models/dto/serviceDTO';
import { UserDto } from '../../../models/dto/userDto';
import { TeamCoverage } from '../../../models/generic/team/TeamCoverage';
import { OrganizationService } from '../../../services/organization.service';
import { ServicesService } from '../../../services/services.service';
import { TeamsService } from '../../../services/team.service';
import { TeamContentCrud } from '../../../models/crud/TeamContentCrud';
import { ServiceAvailabilityRequestedCrud } from '../../../models/crud/ServiceAvailabilityRequestedCrud';

interface TeamRoleSetup {
    id: number;
    name: string;
    required: number;
}

@Component({
    selector: 'app-team-wizard',
    standalone: true,
    imports: [
        CommonModule, FormsModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatStepperModule, MatSnackBarModule
    ],
    templateUrl: './team-wizard.component.html',
    styleUrls: ['./team-wizard.component.scss']
})
export class TeamWizardComponent implements OnInit {
    isLoading = false;
    isSaving = false;
    service: ServiceDTO | null = null;
    users: UserDto[] = [];
    roles: TeamRoleSetup[] = [];
    teamCoverage: TeamCoverage | null = null;
    assignments = new Map<number, number[]>();

    constructor(
        private orgService: OrganizationService,
        private servicesService: ServicesService,
        private teamsService: TeamsService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        this.service = this.parseState<ServiceDTO>(history.state?.service);
    }

    async ngOnInit(): Promise<void> {
        if (!this.service?.id) {
            this.snackBar.open('Seleziona prima un servizio', 'Chiudi', { duration: 3000 });
            this.router.navigate(['/team']);
            return;
        }

        this.isLoading = true;
        try {
            const refreshedService = await this.servicesService.getServicebyID(this.service.id);
            if (refreshedService) this.service = refreshedService;
            [this.users, this.teamCoverage] = await Promise.all([
                this.orgService.getUsersbyOrganization(this.orgService.getOrganizationSelectedId()),
                this.servicesService.getTeamServiceRoles(this.service.id)
            ]);
            this.initializeRoles();
        } catch {
            this.snackBar.open('Errore nel caricamento della configurazione team', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    get totalRequired(): number {
        return this.roles.reduce((total, role) => total + role.required, 0);
    }

    get totalAssigned(): number {
        return new Set([...this.assignments.values()].flat()).size;
    }

    get completedRoles(): number {
        return this.roles.filter(role => this.getAssignedUsers(role.id).length >= role.required).length;
    }

    incrementRequired(role: TeamRoleSetup): void {
        role.required++;
    }

    decrementRequired(role: TeamRoleSetup): void {
        role.required = Math.max(0, role.required - 1);
    }

    removeRole(role: TeamRoleSetup): void {
        this.roles = this.roles.filter(item => item.id !== role.id);
        this.assignments.delete(role.id);
    }

    getAssignedUsers(roleId: number): UserDto[] {
        return (this.assignments.get(roleId) ?? [])
            .map(id => this.users.find(user => user.id === id)!)
            .filter(Boolean);
    }

    toggleUserRole(roleId: number, userId: number): void {
        const current = this.assignments.get(roleId) ?? [];
        const index = current.indexOf(userId);
        const isPersisted = this.teamCoverage?.rolesCoverage.some(item =>
            item.serviceRole?.id === roleId && item.user?.id === userId
        );
        if (index >= 0) {
            if (isPersisted) {
                this.snackBar.open('La rimozione di assegnazioni già salvate non è disponibile', 'Chiudi', { duration: 3000 });
                return;
            }
            current.splice(index, 1);
        } else {
            const assignedRole = this.roles.find(role =>
                role.id !== roleId && (this.assignments.get(role.id) ?? []).includes(userId)
            );
            if (assignedRole) {
                this.snackBar.open(`La persona è già assegnata al ruolo "${assignedRole.name}"`, 'Chiudi', { duration: 3000 });
                return;
            }
            current.push(userId);
        }
        this.assignments.set(roleId, [...current]);
    }

    isAssigned(roleId: number, userId: number): boolean {
        return (this.assignments.get(roleId) ?? []).includes(userId);
    }

    roleIsComplete(role: TeamRoleSetup): boolean {
        return this.getAssignedUsers(role.id).length >= role.required;
    }

    async save(): Promise<void> {
        if (!this.service?.id || !this.service.idteam) {
            this.snackBar.open('Il servizio non ha un team associato', 'Chiudi', { duration: 3000 });
            return;
        }

        this.isSaving = true;
        try {
            const availability = this.roles.map(role => new ServiceAvailabilityRequestedCrud(
                this.service!.id, null, role.id, role.required, 1
            ));
            const existing = new Set((this.teamCoverage?.rolesCoverage ?? [])
                .filter(item => item.serviceRole?.id && item.user?.id)
                .map(item => `${item.serviceRole.id}_${item.user!.id}`));
            const assignments = [...this.assignments.entries()].flatMap(([roleId, userIds]) =>
                userIds
                    .filter(userId => !existing.has(`${roleId}_${userId}`))
                    .map(userId => new TeamContentCrud(this.service!.idteam, userId, null, roleId, 1))
            );

            await this.servicesService.addServicesAvailabilityRequested(availability);
            if (assignments.length) await this.teamsService.postTeamContents(assignments);

            this.snackBar.open('Team salvato con successo', 'Ok', { duration: 2500 });
            this.finish();
        } catch {
            this.snackBar.open('Errore durante il salvataggio del team', 'Chiudi', { duration: 3000 });
        } finally {
            this.isSaving = false;
            this.cdr.detectChanges();
        }
    }

    private finish(): void {
        this.router.navigateByUrl('/team', { state: { service: JSON.stringify(this.service) } });
    }

    cancel(): void {
        this.router.navigateByUrl('/team', {
            state: this.service ? { service: JSON.stringify(this.service) } : undefined
        });
    }

    getUserLabel(user: UserDto): string {
        return `${user.name ?? ''} ${user.surname ?? ''}`.trim() || user.email || '';
    }

    private initializeRoles(): void {
        const requiredByRole = new Map<number, number>();
        const assignments = new Map<number, number[]>();
        for (const coverage of this.teamCoverage?.rolesCoverage ?? []) {
            const roleId = coverage.serviceRole?.id;
            if (!roleId) continue;
            if (!coverage.isExtra) requiredByRole.set(roleId, (requiredByRole.get(roleId) ?? 0) + 1);
            const userIds = assignments.get(roleId) ?? [];
            if (coverage.user?.id && !userIds.includes(coverage.user.id)) userIds.push(coverage.user.id);
            assignments.set(roleId, userIds);
        }
        this.roles = (this.service?.serviceRoles ?? []).map(role => ({
            id: role.id,
            name: role.name ?? 'Ruolo',
            required: requiredByRole.get(role.id) ?? Math.max(1, role.employeeNumber ?? 1)
        }));
        for (const role of this.roles) {
            if (!assignments.has(role.id)) assignments.set(role.id, []);
        }
        this.assignments = assignments;
    }

    private parseState<T>(value: unknown): T | null {
        if (!value) return null;
        if (typeof value !== 'string') return value as T;
        try { return JSON.parse(value) as T; } catch { return null; }
    }
}
