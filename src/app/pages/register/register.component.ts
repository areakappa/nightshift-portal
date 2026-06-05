import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { DemoService } from '../../services/demo.service';
import { RegisterModel } from '../../models/generic/RegisterModel';
import { CustomerInfoCrud } from '../../models/crud/CustomerInfoCrud';
import { ContactInfoCrud } from '../../models/crud/ContactInfoCrud';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatCheckboxModule,
        MatProgressSpinnerModule, MatSnackBarModule
    ],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
    name = new FormControl('', [Validators.required]);
    surname = new FormControl('', [Validators.required]);
    email = new FormControl('', [Validators.required, Validators.email]);
    password = new FormControl('', [Validators.required, Validators.minLength(6)]);
    confirmPassword = new FormControl('', [Validators.required, Validators.minLength(6)]);
    privacy = false;
    showPassword = false;
    submitProcess = false;

    constructor(
        private demoService: DemoService,
        private router: Router,
        private snackBar: MatSnackBar
    ) { }

    get hasPasswordMismatch(): boolean {
        return this.password.value !== this.confirmPassword.value;
    }

    isFormValid(): boolean {
        return this.name.valid && this.surname.valid && this.email.valid &&
            this.password.valid && this.confirmPassword.valid && !this.hasPasswordMismatch;
    }

    async register(): Promise<void> {
        this.name.setValue(this.name.value?.trim() ?? '');
        this.surname.setValue(this.surname.value?.trim() ?? '');

        if (!this.isFormValid()) {
            this.snackBar.open(
                this.hasPasswordMismatch ? 'Le password non coincidono' : 'Compila tutti i campi richiesti',
                'Chiudi', { duration: 3000 }
            );
            return;
        }

        if (!this.privacy) {
            this.snackBar.open('Devi accettare i termini di servizio e la privacy', 'Chiudi', { duration: 3000 });
            return;
        }

        this.submitProcess = true;
        try {
            const customerInfo = new CustomerInfoCrud(
                null,
                null,
                this.email.value!,
                null,
                true,
                null,
                null,
                null,
                null
            );
            customerInfo.UserName = this.email.value!;
            customerInfo.UserPassword = this.password.value!;

            const contactInfo = new ContactInfoCrud(
                this.name.value!,
                this.surname.value!,
                this.email.value!,
                '',
                '',
                null,
                null
            );
            const registerModel = new RegisterModel(customerInfo, contactInfo);

            const result = await this.demoService.register(registerModel);
            if (!result) {
                this.snackBar.open('Registrazione fallita, riprova!', 'Chiudi', { duration: 5000 });
                return;
            }

            this.snackBar.open("Registrazione completata. Controlla la tua email e attiva l'account.", 'Ok', { duration: 7000 });
            await this.router.navigate(['/login']);
        } catch (err: any) {
            const msg = err?.error?.body ?? err?.message ?? 'Errore nella registrazione';
            this.snackBar.open(msg, 'Chiudi', { duration: 5000 });
        } finally {
            this.submitProcess = false;
        }
    }

    goToLogin(): void {
        this.router.navigate(['/login']);
    }
}
