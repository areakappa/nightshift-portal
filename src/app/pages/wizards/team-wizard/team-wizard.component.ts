import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { ServiceDTO } from '../../../models/dto/serviceDTO';
import { UserDto } from '../../../models/dto/userDto';
import { ServiceRoleDto } from '../../../models/dto/ServiceRoleDto';
import { TeamCoverage } from '../../../models/generic/team/TeamCoverage';
import { OrganizationService } from '../../../services/organization.service';
import { ServicesService } from '../../../services/services.service';
import { TeamsService } from '../../../services/team.service';
import { TeamContentCrud } from '../../../models/crud/TeamContentCrud';

@Component({
    selector: 'app-team-wizard',
    standalone: true,
    imports: [
        CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatFormFieldModule, MatInputModule, MatSelectModule,
        MatStepperModule, MatSnackBarModule, MatListModule
    ],
    templateUrl: './team-wizard.component.html',
    styleUrls: ['./team-wizard.component.scss']
})
export class TeamWizardComponent implements OnInit {
    isLoading = false;
    isSaving = false;
    services: ServiceDTO[] = [];
    users: UserDto[] = [];
    roles: ServiceRoleDto[] = [];
    teamCoverage: TeamCoverage | null = null;
    selectedServiceId: number | null = null;
    assignments: Map<number, number[]> = new Map(); // roleId -> userIds
    private requestedServiceId: number | null = null;

    constructor(
        private orgService: OrganizationService,
        private servicesService: ServicesService,
        private teamsService: TeamsService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        const state = history.state;
        if (state?.service) {
            try {
                this.requestedServiceId = (JSON.parse(state.service) as ServiceDTO).id;
            } catch { }
        }
    }

    async ngOnInit(): Promise<void> {
        this.isLoading = true;
        try {
            const orgId = this.orgService.getOrganizationSelectedId();
            [this.services, this.users] = await Promise.all([
                this.servicesService.getServicesbyIDOrganization(orgId),
                this.orgService.getUsersbyOrganization(orgId)
            ]);
            if (this.requestedServiceId && this.services.some(service => service.id === this.requestedServiceId)) {
                this.selectedServiceId = this.requestedServiceId;
                await this.loadSelectedServiceTeam();
            }
        } catch {
            this.snackBar.open('Errore nel caricamento dei dati del team', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    async onServiceSelected(): Promise<void> {
        if (!this.selectedServiceId) return;
        this.isLoading = true;
        try {
            await this.loadSelectedServiceTeam();
        } catch {
            this.snackBar.open('Errore nel caricamento del team del servizio', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    getAssignedUsers(roleId: number): UserDto[] {
        return (this.assignments.get(roleId) ?? []).map(id => this.users.find(u => u.id === id)!).filter(Boolean);
    }

    getAvailableUsers(roleId: number): UserDto[] {
        const allAssigned = [...this.assignments.values()].flat();
        const roleAssigned = this.assignments.get(roleId) ?? [];
        return this.users.filter(u => !allAssigned.includes(u.id!) || roleAssigned.includes(u.id!));
    }

    toggleUserRole(roleId: number, userId: number): void {
        const current = this.assignments.get(roleId) ?? [];
        const idx = current.indexOf(userId);
        if (idx >= 0) { current.splice(idx, 1); } else { current.push(userId); }
        this.assignments.set(roleId, [...current]);
    }

    isAssigned(roleId: number, userId: number): boolean { return (this.assignments.get(roleId) ?? []).includes(userId); }

    async saveAssignments(stepper: MatStepper): Promise<void> {
        const selectedService = this.services.find(service => service.id === this.selectedServiceId);
        if (!selectedService) return;

        this.isSaving = true;
        try {
            const teamContents = [...this.assignments.entries()].flatMap(([roleId, userIds]) =>
                userIds.map(userId => new TeamContentCrud(
                    selectedService.idteam ?? selectedService.team?.id ?? null,
                    userId,
                    null,
                    roleId,
                    1
                ))
            );

            if (teamContents.length === 0) {
                this.snackBar.open('Assegna almeno una persona prima di salvare', 'Ok', { duration: 2500 });
                return;
            }

            const saved = await this.teamsService.postTeamContents(teamContents);
            if (!saved) {
                this.snackBar.open('Impossibile salvare le assegnazioni', 'Chiudi', { duration: 3000 });
                return;
            }

            this.snackBar.open('Team configurato!', 'Ok', { duration: 2000 });
            stepper.next();
        } catch {
            this.snackBar.open('Errore durante il salvataggio del team', 'Chiudi', { duration: 3000 });
        } finally {
            this.isSaving = false;
            this.cdr.detectChanges();
        }
    }

    getUserLabel(user: UserDto): string { return `${user.name ?? ''} ${user.surname ?? ''}`.trim() || user.email || ''; }
    finish(): void {
        const service = this.services.find(item => item.id === this.selectedServiceId);
        this.router.navigateByUrl('/team', { state: service ? { service: JSON.stringify(service) } : undefined });
    }
    cancel(): void { this.router.navigate(['/team']); }

    private async loadSelectedServiceTeam(): Promise<void> {
        if (!this.selectedServiceId) return;

        this.teamCoverage = await this.servicesService.getTeamServiceRoles(this.selectedServiceId);
        const selectedService = this.services.find(service => service.id === this.selectedServiceId);
        const rolesById = new Map<number, ServiceRoleDto>();
        const assignments = new Map<number, number[]>();

        for (const roleCoverage of this.teamCoverage?.rolesCoverage ?? []) {
            const role = roleCoverage.serviceRole;
            if (!role) continue;
            rolesById.set(role.id, role);
            const userIds = assignments.get(role.id) ?? [];
            if (roleCoverage.user?.id && !userIds.includes(roleCoverage.user.id)) {
                userIds.push(roleCoverage.user.id);
            }
            assignments.set(role.id, userIds);
        }

        for (const role of selectedService?.serviceRoles ?? []) {
            rolesById.set(role.id, role);
            if (!assignments.has(role.id)) assignments.set(role.id, []);
        }

        this.roles = [...rolesById.values()];
        this.assignments = assignments;
    }
}
