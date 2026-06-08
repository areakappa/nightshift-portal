import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { ServiceRoleDto } from '../../models/dto/ServiceRoleDto';
import { ServiceRoleCrud } from '../../models/crud/ServiceRoleCrud';
import { ServicesService } from '../../services/services.service';

@Component({
    selector: 'app-service-roles',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule,
        MatCardModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatFormFieldModule, MatInputModule,
        MatDialogModule, MatSnackBarModule, MatListModule, MatChipsModule
    ],
    templateUrl: './service-roles.component.html',
    styleUrls: ['./service-roles.component.scss']
})
export class ServiceRolesComponent implements OnInit {
    service: ServiceDTO | null = null;
    roles: ServiceRoleDto[] = [];
    isLoading = false;
    showAddForm = false;

    roleName = new FormControl('', [Validators.required]);
    roleDescription = new FormControl('');
    roleMinRequired = new FormControl(1, [Validators.required, Validators.min(1)]);
    savingRole = false;

    constructor(
        private servicesService: ServicesService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        const state = history.state;
        if (state?.service) {
            try { this.service = JSON.parse(state.service); } catch { }
        }
    }

    async ngOnInit(): Promise<void> {
        await this.loadRoles();
    }

    async loadRoles(): Promise<void> {
        if (!this.service?.id) return;
        this.isLoading = true;
        try {
            const svc = await this.servicesService.getServicebyID(this.service.id);
            this.roles = svc?.serviceRoles ?? [];
        } catch (e) {
            this.snackBar.open('Errore nel caricamento ruoli', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    async addRole(): Promise<void> {
        if (this.roleName.invalid || !this.service?.id) return;
        this.savingRole = true;
        try {
            const crud = new ServiceRoleCrud(
                this.roleName.value!,
                this.roleDescription.value ?? '',
                0,
                1,
                this.roleMinRequired.value ?? 1
            );
            crud.Idservice = this.service.id;
            await this.servicesService.postServiceRole(crud);
            this.snackBar.open('Ruolo aggiunto', 'Ok', { duration: 2000 });
            this.resetForm();
            await this.loadRoles();
        } catch (e) {
            this.snackBar.open('Errore nell\'aggiunta del ruolo', 'Chiudi', { duration: 3000 });
        } finally {
            this.savingRole = false;
        }
    }

    async deleteRole(role: ServiceRoleDto): Promise<void> {
        try {
            await this.servicesService.deleteServiceRole(role.id);
            this.snackBar.open('Ruolo eliminato', 'Ok', { duration: 2000 });
            await this.loadRoles();
        } catch {
            this.snackBar.open('Errore nell\'eliminazione', 'Chiudi', { duration: 3000 });
        }
    }

    resetForm(): void {
        this.roleName.reset(); this.roleDescription.reset(); this.roleMinRequired.setValue(1);
        this.showAddForm = false;
    }

    goBack(): void {
        this.router.navigateByUrl('/service-detail', { state: { service: JSON.stringify(this.service) } });
    }
}
