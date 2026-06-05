import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
                if (!this.teamCoverage) return true;
                return !this.teamCoverage.rolesCoverage?.some(rc => rc.user?.id === u.id);
            });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    async confirm(): Promise<void> {
        if (this.createNew) {
            if (this.newUserForm.invalid) { this.snackBar.open('Compila tutti i campi', 'Chiudi', { duration: 2000 }); return; }
            try {
                await this.usersService.sendInviteUser({
                    email: this.newUserForm.value.email,
                    name: this.newUserForm.value.name,
                    surname: this.newUserForm.value.surname
                } as any);
                this.snackBar.open('Invito inviato!', 'Ok', { duration: 2000 });
                this.router.navigate(['/team']);
            } catch {
                this.snackBar.open('Errore nell\'invito', 'Chiudi', { duration: 3000 });
            }
        } else {
            if (!this.selectedUser) { this.snackBar.open('Seleziona un utente', 'Chiudi', { duration: 2000 }); return; }
            this.router.navigate(['/team']);
        }
    }

    cancel(): void { this.router.navigate(['/team']); }
    selectUser(user: UserDto): void { this.selectedUser = user; }
    getUserLabel(user: UserDto): string { return `${user.name ?? ''} ${user.surname ?? ''}`.trim() || user.email || ''; }
}
