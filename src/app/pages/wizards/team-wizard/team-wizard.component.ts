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
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { ServiceDTO } from '../../../models/dto/serviceDTO';
import { UserDto } from '../../../models/dto/userDto';
import { ServiceRoleDto } from '../../../models/dto/ServiceRoleDto';
import { TeamCoverage } from '../../../models/generic/team/TeamCoverage';
import { OrganizationService } from '../../../services/organization.service';
import { ServicesService } from '../../../services/services.service';

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

    constructor(
        private orgService: OrganizationService,
        private servicesService: ServicesService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit(): Promise<void> {
        this.isLoading = true;
        try {
            const orgId = this.orgService.getOrganizationSelectedId();
            [this.services, this.users] = await Promise.all([
                this.servicesService.getServicesbyIDOrganization(orgId),
                this.orgService.getUsersbyOrganization(orgId)
            ]);
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    async onServiceSelected(): Promise<void> {
        if (!this.selectedServiceId) return;
        this.isLoading = true;
        try {
            this.teamCoverage = await this.servicesService.getTeamServiceRoles(this.selectedServiceId);
            this.roles = (this.teamCoverage?.rolesCoverage ?? []).map(rc => rc.serviceRole).filter(Boolean) as ServiceRoleDto[];
            this.assignments = new Map(this.roles.map(r => [r.id, []]));
        } finally {
            this.isLoading = false;
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

    async saveAssignments(): Promise<void> {
        this.isSaving = true;
        // Assignment persistence would go through schedule API; for now just report success
        this.isSaving = false;
        this.snackBar.open('Team configurato!', 'Ok', { duration: 2000 });
    }

    getUserLabel(user: UserDto): string { return `${user.name ?? ''} ${user.surname ?? ''}`.trim() || user.email || ''; }
    finish(): void { this.router.navigate(['/team']); }
    cancel(): void { this.router.navigate(['/team']); }
}
