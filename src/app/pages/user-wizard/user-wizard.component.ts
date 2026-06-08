import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { UserDto } from '../../models/dto/userDto';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { TeamCoverage } from '../../models/generic/team/TeamCoverage';
import { TeamRoleCoverage } from '../../models/generic/team/TeamRoleCoverage';
import { OrganizationService } from '../../services/organization.service';
import { ServicesService } from '../../services/services.service';
import { UsersService } from '../../services/users.service';
import { DemoService } from '../../services/demo.service';
import { PreUser } from '../../models/generic/PreUser';
import { InviteUser } from '../../models/generic/team/InviteUser';

@Component({
    selector: 'app-user-wizard',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule, MatCardModule, MatButtonModule,
        MatIconModule, MatProgressSpinnerModule, MatFormFieldModule, MatInputModule,
        MatSelectModule, MatStepperModule, MatSnackBarModule, MatListModule
    ],
    templateUrl: './user-wizard.component.html',
    styleUrls: ['./user-wizard.component.scss']
})
export class UserWizardComponent implements OnInit {
    isLoading = false;
    users: UserDto[] = [];
    filteredUsers: UserDto[] = [];
    services: ServiceDTO[] = [];
    teamCoverage: TeamCoverage | null = null;
    roleSelected: TeamRoleCoverage | null = null;
    serviceSelected: ServiceDTO | null = null;
    rolesSnapshot: any[] = [];
    selectedUser: UserDto | null = null;
    createNew = false;
    inviteEmail = '';
    inviteName = '';
    inviteSurname = '';

    typeForm: FormGroup;
    newUserForm: FormGroup;

    constructor(
        private orgService: OrganizationService,
        private servicesService: ServicesService,
        private usersService: UsersService,
        private demoService: DemoService,
        private router: Router,
        private snackBar: MatSnackBar,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef
    ) {
        this.typeForm = this.fb.group({ createNew: [false] });
        this.newUserForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            name: ['', Validators.required],
            surname: ['', Validators.required]
        });

        const state = history.state ?? {};
        this.teamCoverage = this.tryParse(state.teamCoverage);
        this.roleSelected = this.tryParse(state.teamRole);
        this.serviceSelected = this.tryParse(state.service);
        this.rolesSnapshot = this.tryParse(state.roles) ?? [];
        this.users = this.tryParse(state.organizationUsers) ?? [];
    }

    async ngOnInit(): Promise<void> {
        await this.loadUsers();
    }

    private tryParse<T>(v: any): T | null {
        if (!v) return null;
        if (typeof v !== 'string') return v as T;
        try { return JSON.parse(v); } catch { return null; }
    }

    async loadUsers(): Promise<void> {
        this.isLoading = true;
        try {
            const orgId = this.orgService.getOrganizationSelectedId();
            if (!this.users.length && orgId) {
                this.users = await this.orgService.getUsersbyOrganization(orgId);
            }
            this.filteredUsers = this.users.filter(u => {
                const persisted = this.teamCoverage?.rolesCoverage?.some(rc => rc.user?.id === u.id);
                const local = this.rolesSnapshot.some(role => role.users?.some((user: UserDto) => user.id === u.id));
                return !persisted && !local;
            });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    async confirm(): Promise<void> {
        if (this.createNew) {
            if (this.newUserForm.invalid) { this.snackBar.open('Compila tutti i campi', 'Chiudi', { duration: 2000 }); return; }
            if (!this.serviceSelected?.id || !this.serviceSelected.idteam || !this.roleSelected?.serviceRole?.id) {
                this.snackBar.open('Servizio, team o ruolo non disponibili per l\'invito', 'Chiudi', { duration: 3000 });
                return;
            }
            try {
                const preUser = new PreUser(
                    this.newUserForm.value.name,
                    this.newUserForm.value.surname,
                    this.newUserForm.value.email,
                    this.serviceSelected.id,
                    this.orgService.getOrganizationSelectedId(),
                    this.roleSelected.serviceRole.id,
                    this.serviceSelected.idteam,
                    '',
                    ''
                );
                const userAdded = await this.demoService.addPreUser(preUser);
                if (!userAdded?.id) {
                    this.snackBar.open('Impossibile creare l\'utente da invitare', 'Chiudi', { duration: 3000 });
                    return;
                }

                preUser.IdUser = userAdded.id;
                const params = new HttpParams({ fromObject: preUser as any }).toString();
                const invite = new InviteUser(
                    `https://nightshift.areakappa.it/home?${params}`,
                    this.serviceSelected.idteam,
                    this.orgService.getOrganizationSelectedId(),
                    userAdded.id
                );
                const sent = await this.usersService.sendInviteUser(invite);
                if (!sent) {
                    this.snackBar.open('Il backend non ha inviato l\'invito', 'Chiudi', { duration: 3000 });
                    return;
                }

                const role = this.rolesSnapshot.find(item =>
                    Number(item.id) === Number(this.roleSelected?.serviceRole?.id)
                );
                if (role) {
                    role.users ??= [];
                    role.users.push(userAdded);
                }
                this.snackBar.open('Invito inviato!', 'Ok', { duration: 2000 });
                this.navigateBack();
            } catch {
                this.snackBar.open('Errore nell\'invito', 'Chiudi', { duration: 3000 });
            }
        } else {
            if (!this.selectedUser) { this.snackBar.open('Seleziona un utente', 'Chiudi', { duration: 2000 }); return; }
            const roleId = this.roleSelected?.serviceRole?.id;
            const role = this.rolesSnapshot.find(item => Number(item.id) === Number(roleId));
            if (role) {
                role.users ??= [];
                if (!role.users.some((user: UserDto) => user.id === this.selectedUser!.id)) {
                    role.users.push(this.selectedUser);
                }
            }
            this.navigateBack();
        }
    }

    cancel(): void { this.navigateBack(); }
    selectUser(user: UserDto): void { this.selectedUser = user; }
    getUserLabel(user: UserDto): string { return `${user.name ?? ''} ${user.surname ?? ''}`.trim() || user.email || ''; }

    private navigateBack(): void {
        this.router.navigateByUrl('/team', {
            replaceUrl: true,
            state: {
                service: JSON.stringify(this.serviceSelected),
                organizationUsers: JSON.stringify(this.users),
                roles: JSON.stringify(this.rolesSnapshot)
            }
        });
    }
}
