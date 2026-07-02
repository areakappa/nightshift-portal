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
import { TeamRoleCoverage } from '../../../models/generic/team/TeamRoleCoverage';
import { TeamSizeEstimateResponse } from '../../../models/generic/team/TeamSizeEstimate';

interface TeamRoleSetup {
    id: number;
    name: string;
    required: number;
    concurrentRequired: number;
    weeklyRequiredHours?: number;
    aiReason?: string;
}

interface InitialRoleRequirement {
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
    returnToServiceDetail = false;
    initialRoleRequirements: InitialRoleRequirement[] = [];
    returnedRoles: Array<TeamRoleSetup & { users?: UserDto[] }> = [];
    returnedUsers: UserDto[] = [];
    selectedStepIndex = 0;
    isEstimatingTeamSize = false;
    teamSizeEstimate: TeamSizeEstimateResponse | null = null;

    constructor(
        private orgService: OrganizationService,
        private servicesService: ServicesService,
        private teamsService: TeamsService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        this.service = this.parseState<ServiceDTO>(history.state?.service);
        this.initialRoleRequirements = this.parseState<InitialRoleRequirement[]>(
            history.state?.initialRoleRequirements
        ) ?? [];
        this.returnedRoles = this.parseState<Array<TeamRoleSetup & { users?: UserDto[] }>>(history.state?.roles) ?? [];
        this.returnedUsers = this.parseState<UserDto[]>(history.state?.organizationUsers) ?? [];
        this.selectedStepIndex = history.state?.returnToAssignmentStep === true ? 1 : 0;
        this.returnToServiceDetail = history.state?.returnToServiceDetail === true;
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
            this.mergeReturnedUsers();
            this.initializeRoles();
            this.applyReturnedAssignments();
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

    get totalConcurrentRequired(): number {
        return this.roles.reduce((total, role) => total + role.concurrentRequired, 0);
    }

    get totalAssigned(): number {
        return new Set([...this.assignments.values()].flat()).size;
    }

    get completedRoles(): number {
        return this.roles.filter(role => this.getAssignedUsers(role.id).length >= role.required).length;
    }

    incrementRequired(role: TeamRoleSetup): void {
        role.concurrentRequired++;
    }

    decrementRequired(role: TeamRoleSetup): void {
        role.concurrentRequired = Math.max(0, role.concurrentRequired - 1);
    }

    removeRole(role: TeamRoleSetup): void {
        this.roles = this.roles.filter(item => item.id !== role.id);
        this.assignments.delete(role.id);
    }

    async continueFromRoles(): Promise<void> {
        if (this.roles.length === 0 || this.isEstimatingTeamSize) return;
        const calculated = await this.calculateTeamWithAi();
        if (!calculated) return;
        this.selectedStepIndex = 1;
        this.cdr.detectChanges();
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

    openUserWizard(role: TeamRoleSetup): void {
        if (!this.service) return;
        const roleCoverage = this.teamCoverage?.rolesCoverage.find(item => item.serviceRole?.id === role.id)
            ?? { serviceRole: { id: role.id, name: role.name } } as TeamRoleCoverage;

        this.router.navigateByUrl('/user-wizard', {
            state: {
                service: JSON.stringify(this.service),
                teamCoverage: JSON.stringify(this.teamCoverage),
                teamRole: JSON.stringify(roleCoverage),
                organizationUsers: JSON.stringify(this.users),
                roles: JSON.stringify(this.buildRolesSnapshot()),
                initialRoleRequirements: JSON.stringify(this.roles.map(item => ({ name: item.name, required: item.required }))),
                returnToTeamWizard: true,
                returnToAssignmentStep: true,
                returnToServiceDetail: this.returnToServiceDetail
            }
        });
    }

    roleIsComplete(role: TeamRoleSetup): boolean {
        return this.getAssignedUsers(role.id).length >= role.required;
    }

    async calculateTeamWithAi(): Promise<boolean> {
        if (!this.service?.id || !this.roles.length || this.isEstimatingTeamSize) return false;
        this.isEstimatingTeamSize = true;
        try {
            const estimate = await this.servicesService.estimateTeamSize({
                idservice: this.service.id,
                roles: this.roles.map(role => ({ idserviceRole: role.id, concurrentRequired: role.concurrentRequired }))
            });
            this.teamSizeEstimate = estimate;
            const byRole = new Map((estimate?.roles ?? []).map(role => [role.idserviceRole, role]));
            this.roles = this.roles.map(role => {
                const value = byRole.get(role.id);
                return value ? {
                    ...role,
                    concurrentRequired: value.concurrentRequired,
                    required: value.suggestedTeamMembers,
                    weeklyRequiredHours: value.weeklyRequiredHours,
                    aiReason: value.reason
                } : role;
            });
            this.snackBar.open('Team consigliato calcolato', 'Ok', { duration: 1800 });
            return true;
        } catch {
            this.snackBar.open('Non riesco a calcolare il team consigliato ora.', 'Chiudi', { duration: 3000 });
            return false;
        } finally {
            this.isEstimatingTeamSize = false;
            this.cdr.detectChanges();
        }
    }

    async save(): Promise<void> {
        if (!this.service?.id || !this.service.idteam) {
            this.snackBar.open('Il servizio non ha un team associato', 'Chiudi', { duration: 3000 });
            return;
        }

        this.isSaving = true;
        try {
            const availability = this.roles.map(role => new ServiceAvailabilityRequestedCrud(
                this.service!.id, null, role.id, role.concurrentRequired, role.required, 1
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
        this.navigateBack();
    }

    cancel(): void {
        this.navigateBack();
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
            concurrentRequired: this.getInitialRequired(role.name, requiredByRole.get(role.id), role.employeeNumber),
            required: this.getInitialRequired(role.name, requiredByRole.get(role.id), role.employeeNumber)
        }));
        for (const role of this.roles) {
            if (!assignments.has(role.id)) assignments.set(role.id, []);
        }
        this.assignments = assignments;
    }

    private buildRolesSnapshot(): Array<TeamRoleSetup & { users: UserDto[] }> {
        return this.roles.map(role => ({ ...role, users: this.getAssignedUsers(role.id) }));
    }

    private mergeReturnedUsers(): void {
        const returnedRoleUsers = this.returnedRoles.flatMap(role => role.users ?? []);
        for (const user of [...this.returnedUsers, ...returnedRoleUsers]) {
            if (user.id && !this.users.some(item => item.id === user.id)) this.users.push(user);
        }
    }

    private applyReturnedAssignments(): void {
        for (const returnedRole of this.returnedRoles) {
            const role = this.roles.find(item => item.id === returnedRole.id);
            if (!role) continue;
            role.required = returnedRole.required;
            role.concurrentRequired = returnedRole.concurrentRequired ?? returnedRole.required;
            const current = this.assignments.get(role.id) ?? [];
            const returnedIds = (returnedRole.users ?? [])
                .map(user => user.id)
                .filter((id): id is number => id !== null);
            this.assignments.set(role.id, [...new Set([...current, ...returnedIds])]);
        }
    }

    private getInitialRequired(
        roleName: string | null,
        coverageRequired: number | undefined,
        employeeNumber: number | undefined
    ): number {
        const requirement = this.initialRoleRequirements.find(item => item.name === roleName);
        return requirement?.required ?? coverageRequired ?? Math.max(1, employeeNumber ?? 1);
    }

    private parseState<T>(value: unknown): T | null {
        if (!value) return null;
        if (typeof value !== 'string') return value as T;
        try { return JSON.parse(value) as T; } catch { return null; }
    }

    private navigateBack(): void {
        const target = this.returnToServiceDetail ? '/service-detail' : '/team';
        this.router.navigateByUrl(target, {
            state: this.service ? { service: JSON.stringify(this.service) } : undefined
        });
    }
}
