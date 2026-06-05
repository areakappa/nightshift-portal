import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ServicesService } from '../../../services/services.service';
import { OrganizationService } from '../../../services/organization.service';
import { ServiceDTO } from '../../../models/dto/serviceDTO';
import { ServiceRoleDto } from '../../../models/dto/ServiceRoleDto';

@Component({
    selector: 'app-service-wizard',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule,
        MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
        MatFormFieldModule, MatInputModule, MatStepperModule, MatSnackBarModule, MatDividerModule
    ],
    templateUrl: './service-wizard.component.html',
    styleUrls: ['./service-wizard.component.scss']
})
export class ServiceWizardComponent {
    isSaving = false;
    createdService: ServiceDTO | null = null;
    roles: Partial<ServiceRoleDto>[] = [];
    newRoleName = '';

    infoForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        private servicesService: ServicesService,
        private orgService: OrganizationService,
        private router: Router,
        private snackBar: MatSnackBar
    ) {
        this.infoForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            description: ['']
        });
    }

    async createService(): Promise<void> {
        if (this.infoForm.invalid) return;
        this.isSaving = true;
        try {
            const orgId = this.orgService.getOrganizationSelectedId();
            this.createdService = await this.servicesService.postService({
                name: this.infoForm.value.name.trim(),
                description: this.infoForm.value.description.trim(),
                idOrganization: orgId
            } as any);
            this.snackBar.open('Servizio creato!', 'Ok', { duration: 2000 });
        } catch {
            this.snackBar.open('Errore nella creazione del servizio', 'Chiudi', { duration: 3000 });
            this.isSaving = false;
        } finally {
            this.isSaving = false;
        }
    }

    addRole(): void {
        const name = this.newRoleName.trim();
        if (!name) return;
        this.roles.push({ name });
        this.newRoleName = '';
    }

    removeRole(i: number): void { this.roles.splice(i, 1); }

    async saveRoles(): Promise<void> {
        if (!this.createdService) return;
        this.isSaving = true;
        try {
            for (const role of this.roles) {
                await this.servicesService.postServiceRole({ ...role, idService: this.createdService.id } as any);
            }
            this.snackBar.open('Ruoli salvati!', 'Ok', { duration: 2000 });
        } catch {
            this.snackBar.open('Errore nel salvataggio ruoli', 'Chiudi', { duration: 3000 });
        } finally {
            this.isSaving = false;
        }
    }

    finish(): void { this.router.navigate(['/services']); }
    cancel(): void { this.router.navigate(['/services']); }
}
