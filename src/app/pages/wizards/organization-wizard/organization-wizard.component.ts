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
import { OrganizationService } from '../../../services/organization.service';
import { UsersService } from '../../../services/users.service';

@Component({
    selector: 'app-organization-wizard',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule,
        MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
        MatFormFieldModule, MatInputModule, MatStepperModule, MatSnackBarModule
    ],
    templateUrl: './organization-wizard.component.html',
    styleUrls: ['./organization-wizard.component.scss']
})
export class OrganizationWizardComponent {
    isSaving = false;
    inviteEmails: string[] = [];
    newInviteEmail = '';

    infoForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        private orgService: OrganizationService,
        private usersService: UsersService,
        private router: Router,
        private snackBar: MatSnackBar
    ) {
        this.infoForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            description: [''],
            businessName: ['']
        });
    }

    async saveInfo(): Promise<void> {
        if (this.infoForm.invalid) return;
        this.isSaving = true;
        try {
            await this.orgService.postOrganization(this.infoForm.value);
            this.snackBar.open('Organizzazione creata!', 'Ok', { duration: 2000 });
        } catch {
            this.snackBar.open('Errore nella creazione', 'Chiudi', { duration: 3000 });
        } finally {
            this.isSaving = false;
        }
    }

    addInviteEmail(): void {
        const e = this.newInviteEmail.trim();
        if (e && !this.inviteEmails.includes(e)) { this.inviteEmails.push(e); this.newInviteEmail = ''; }
    }

    removeEmail(i: number): void { this.inviteEmails.splice(i, 1); }

    async sendInvites(): Promise<void> {
        for (const email of this.inviteEmails) {
            try { await this.usersService.sendInviteUser({ email } as any); } catch { }
        }
        this.snackBar.open(`${this.inviteEmails.length} inviti inviati`, 'Ok', { duration: 2000 });
    }

    finish(): void { this.router.navigate(['/organization-detail']); }
    cancel(): void { this.router.navigate(['/home']); }
}
