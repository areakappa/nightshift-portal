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
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { UserDto } from '../../models/dto/userDto';
import { TeamCoverage } from '../../models/generic/team/TeamCoverage';
import { TeamRoleCoverage } from '../../models/generic/team/TeamRoleCoverage';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { OrganizationService } from '../../services/organization.service';
import { ServicesService } from '../../services/services.service';
import { TeamsService } from '../../services/team.service';
import { AuthenticationService } from '../../services/authentication.service';
import { TeamContentCrud } from '../../models/crud/TeamContentCrud';
import { DemoLimitService } from '../../services/demo-limit.service';
import { UpgradeService } from '../../services/upgrade.service';

interface TeamRoleView {
    id: number;
    name: string;
    required: number;
    users: UserDto[];
}

@Component({
    selector: 'app-team',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatFormFieldModule, MatInputModule,
        MatListModule, MatChipsModule, MatSnackBarModule,
        MatDialogModule, MatDividerModule, MatSelectModule
    ],
    templateUrl: './team.component.html',
    styleUrls: ['./team.component.scss']
})
export class TeamComponent implements OnInit {
    users: UserDto[] = [];
    filteredUsers: UserDto[] = [];
    services: ServiceDTO[] = [];
    roles: TeamRoleView[] = [];
    teamCoverage: TeamCoverage | null = null;
    service: ServiceDTO | null = null;
    selectedServiceId: number | null = null;
    isLoading = false;
    isSaving = false;
    searchText = '';
    returnToServiceDetail = false;

    constructor(
        private organizationService: OrganizationService,
        private servicesService: ServicesService,
        private teamsService: TeamsService,
        private authService: AuthenticationService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef,
        private demoLimitService: DemoLimitService,
        private upgradeService: UpgradeService
    ) {
        const state = history.state;
        if (state?.service) { try { this.service = JSON.parse(state.service); } catch { } }
        this.returnToServiceDetail = state?.returnToServiceDetail === true;
        if (state?.organizationUsers) { try { this.users = JSON.parse(state.organizationUsers); this.filteredUsers = [...this.users]; } catch { } }
        if (state?.roles) { try { this.roles = JSON.parse(state.roles); } catch { } }
    }

    async ngOnInit(): Promise<void> {
        await this.loadData();
    }

    async loadData(): Promise<void> {
        this.isLoading = true;
        try {
            const orgId = this.organizationService.getOrganizationSelectedId();
            [this.users, this.services] = await Promise.all([
                this.organizationService.getUsersbyOrganization(orgId),
                this.servicesService.getServicesbyIDOrganization(orgId)
            ]);
            this.applyFilter();
            if (this.service?.id && this.services.some(item => item.id === this.service!.id)) {
                this.selectedServiceId = this.service.id;
            } else if (this.services.length === 1) {
                this.selectedServiceId = this.services[0].id;
                this.service = this.services[0];
            }
            if (this.selectedServiceId) {
                await this.loadServiceTeam(this.roles.length > 0);
            }
        } catch {
            this.snackBar.open('Errore nel caricamento team', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    async onServiceSelected(): Promise<void> {
        this.service = this.services.find(item => item.id === this.selectedServiceId) ?? null;
        this.roles = [];
        this.teamCoverage = null;
        if (!this.service) return;
        this.isLoading = true;
        try {
            await this.loadServiceTeam(false);
        } catch {
            this.snackBar.open('Errore nel caricamento del team del servizio', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    applyFilter(): void {
        const q = this.searchText.trim().toLowerCase();
        this.filteredUsers = q
            ? this.users.filter(u => `${u.name} ${u.surname} ${u.email}`.toLowerCase().includes(q))
            : [...this.users];
    }

    async removeUser(user: UserDto): Promise<void> {
        try {
            const orgId = this.organizationService.getOrganizationSelectedId();
            await this.organizationService.removeOrganizationUser(orgId, user.id!);
            this.snackBar.open('Utente rimosso', 'Ok', { duration: 2000 });
            await this.loadData();
        } catch {
            this.snackBar.open('Errore nella rimozione', 'Chiudi', { duration: 3000 });
        }
    }

    getInitials(user: UserDto): string {
        return `${user.name?.charAt(0) ?? ''}${user.surname?.charAt(0) ?? ''}`.toUpperCase();
    }

    async openUserWizard(role: TeamRoleView): Promise<void> {
        if (!this.service) return;
        const maxUsers = await this.demoLimitService.getMaxUsersPerService();
        if (maxUsers !== null && this.getAssignedUserIds().size >= maxUsers) {
            const tier = await this.demoLimitService.getCurrentLicenseTier();
            await this.upgradeService.presentUpgradeFlow(
                `Con il piano ${tier.toUpperCase()} puoi assegnare al massimo ${maxUsers} utenti per servizio.`,
                { contactOnly: tier === 'pro' }
            );
            return;
        }
        const roleCoverage = this.teamCoverage?.rolesCoverage.find(item => item.serviceRole?.id === role.id)
            ?? { serviceRole: { id: role.id, name: role.name } } as TeamRoleCoverage;
        this.router.navigateByUrl('/user-wizard', {
            state: {
                service: JSON.stringify(this.service),
                teamCoverage: JSON.stringify(this.teamCoverage),
                teamRole: JSON.stringify(roleCoverage),
                organizationUsers: JSON.stringify(this.users),
                roles: JSON.stringify(this.roles),
                returnToServiceDetail: this.returnToServiceDetail
            }
        });
    }

    goBack(): void {
        if (this.returnToServiceDetail && this.service) {
            this.router.navigateByUrl('/service-detail', {
                state: { service: JSON.stringify(this.service) }
            });
            return;
        }
        this.router.navigate(['/services']);
    }

    removeLocalAssignee(role: TeamRoleView, user: UserDto): void {
        const persisted = this.teamCoverage?.rolesCoverage.some(item =>
            item.serviceRole?.id === role.id && item.user?.id === user.id
        );
        if (persisted) {
            this.snackBar.open('La rimozione di assegnazioni già salvate non è disponibile', 'Chiudi', { duration: 3000 });
            return;
        }
        role.users = role.users.filter(item => item.id !== user.id);
    }

    async saveAssignments(): Promise<void> {
        if (!this.service?.idteam) {
            this.snackBar.open('Il servizio non ha un team associato', 'Chiudi', { duration: 3000 });
            return;
        }
        const existing = new Set((this.teamCoverage?.rolesCoverage ?? [])
            .filter(item => item.serviceRole?.id && item.user?.id)
            .map(item => `${item.serviceRole.id}_${item.user!.id}`));
        const payload = this.roles.flatMap(role => role.users
            .filter(user => user.id && !existing.has(`${role.id}_${user.id}`))
            .map(user => new TeamContentCrud(this.service!.idteam, user.id, null, role.id, 1)));

        if (!payload.length) {
            this.snackBar.open('Nessuna nuova assegnazione da salvare', 'Ok', { duration: 2500 });
            return;
        }
        this.isSaving = true;
        try {
            await this.teamsService.postTeamContents(payload);
            this.snackBar.open('Team salvato con successo', 'Ok', { duration: 2500 });
            await this.loadServiceTeam(false);
        } catch {
            this.snackBar.open('Errore durante il salvataggio del team', 'Chiudi', { duration: 3000 });
        } finally {
            this.isSaving = false;
            this.cdr.detectChanges();
        }
    }

    goToTeamWizard(): void {
        if (!this.service) {
            this.snackBar.open('Seleziona prima un servizio', 'Chiudi', { duration: 2500 });
            return;
        }
        this.router.navigateByUrl('/wizard/team', {
            state: this.service ? {
                service: JSON.stringify(this.service),
                returnToServiceDetail: this.returnToServiceDetail
            } : undefined
        });
    }

    private async loadServiceTeam(preserveLocalRoles: boolean): Promise<void> {
        if (!this.selectedServiceId) return;
        this.teamCoverage = await this.servicesService.getTeamServiceRoles(this.selectedServiceId);
        if (preserveLocalRoles) return;

        const roles = new Map<number, TeamRoleView>();
        for (const coverage of this.teamCoverage?.rolesCoverage ?? []) {
            const serviceRole = coverage.serviceRole;
            if (!serviceRole?.id) continue;
            const role = roles.get(serviceRole.id) ?? {
                id: serviceRole.id,
                name: serviceRole.name ?? 'Ruolo',
                required: 0,
                users: []
            };
            if (!coverage.isExtra) role.required++;
            if (coverage.user?.id && !role.users.some(user => user.id === coverage.user!.id)) {
                role.users.push(coverage.user);
            }
            roles.set(role.id, role);
        }
        for (const serviceRole of this.service?.serviceRoles ?? []) {
            if (!roles.has(serviceRole.id)) {
                roles.set(serviceRole.id, {
                    id: serviceRole.id,
                    name: serviceRole.name ?? 'Ruolo',
                    required: serviceRole.employeeNumber ?? 0,
                    users: []
                });
            }
        }
        this.roles = [...roles.values()];
    }

    private getAssignedUserIds(): Set<number> {
        const ids = new Set<number>();
        for (const coverage of this.teamCoverage?.rolesCoverage ?? []) {
            if (coverage.user?.id) ids.add(coverage.user.id);
        }
        for (const role of this.roles) {
            for (const user of role.users) {
                if (user.id) ids.add(user.id);
            }
        }
        return ids;
    }
}
