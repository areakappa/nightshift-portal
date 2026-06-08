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
import { UserDto } from '../../models/dto/userDto';
import { TeamCoverage } from '../../models/generic/team/TeamCoverage';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { OrganizationService } from '../../services/organization.service';
import { ServicesService } from '../../services/services.service';
import { TeamsService } from '../../services/team.service';
import { AuthenticationService } from '../../services/authentication.service';
import { UsersService } from '../../services/users.service';
import { InviteUser } from '../../models/generic/team/InviteUser';

@Component({
    selector: 'app-team',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatFormFieldModule, MatInputModule,
        MatListModule, MatChipsModule, MatSnackBarModule,
        MatDialogModule, MatDividerModule
    ],
    templateUrl: './team.component.html',
    styleUrls: ['./team.component.scss']
})
export class TeamComponent implements OnInit {
    users: UserDto[] = [];
    filteredUsers: UserDto[] = [];
    teamCoverage: TeamCoverage | null = null;
    service: ServiceDTO | null = null;
    isLoading = false;
    searchText = '';
    inviteEmail = '';
    showInviteForm = false;
    inviting = false;

    constructor(
        private organizationService: OrganizationService,
        private servicesService: ServicesService,
        private authService: AuthenticationService,
        private usersService: UsersService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        const state = history.state;
        if (state?.service) { try { this.service = JSON.parse(state.service); } catch { } }
        if (state?.organizationUsers) { try { this.users = JSON.parse(state.organizationUsers); this.filteredUsers = [...this.users]; } catch { } }
    }

    async ngOnInit(): Promise<void> {
        await this.loadData();
    }

    async loadData(): Promise<void> {
        this.isLoading = true;
        try {
            const orgId = this.organizationService.getOrganizationSelectedId();
            this.users = await this.organizationService.getUsersbyOrganization(orgId);
            this.applyFilter();
            if (this.service?.id) {
                this.teamCoverage = await this.servicesService.getTeamServiceRoles(this.service.id);
            }
        } catch {
            this.snackBar.open('Errore nel caricamento team', 'Chiudi', { duration: 3000 });
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

    async inviteUser(): Promise<void> {
        if (!this.inviteEmail) return;
        this.inviting = true;
        try {
            const invite: InviteUser = {
                email: this.inviteEmail,
                idOrganization: this.organizationService.getOrganizationSelectedId(),
            } as any;
            await this.usersService.sendInviteUser(invite);
            this.snackBar.open('Invito inviato!', 'Ok', { duration: 3000 });
            this.inviteEmail = ''; this.showInviteForm = false;
            await this.loadData();
        } catch {
            this.snackBar.open('Errore nell\'invio dell\'invito', 'Chiudi', { duration: 3000 });
        } finally {
            this.inviting = false;
        }
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

    goToUserWizard(): void { this.router.navigate(['/user-wizard']); }
    goToTeamWizard(): void {
        this.router.navigateByUrl('/wizard/team', { state: this.service ? { service: JSON.stringify(this.service) } : undefined });
    }
}
