import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule
    ],
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
    email = new FormControl('', [Validators.required, Validators.email]);
    submitProcess = false;
    sent = false;

    constructor(
        private authService: AuthenticationService,
        private snackBar: MatSnackBar,
        private location: Location
    ) { }

    async submitRecoveryEmail(): Promise<void> {
        if (this.submitProcess || this.email.invalid) return;
        this.submitProcess = true;
        try {
            await this.authService.requestPasswordRecovery(this.email.value!);
            this.sent = true;
            this.snackBar.open('Se l\'email è registrata, riceverai le istruzioni per reimpostare la password.', 'Ok', { duration: 6000 });
            this.email.reset();
        } catch (error: any) {
            const msg = error?.error?.body ?? error?.error?.message ?? 'Errore durante la richiesta.';
            this.snackBar.open(msg, 'Chiudi', { duration: 5000 });
        } finally {
            this.submitProcess = false;
        }
    }

    back(): void {
        this.location.back();
    }
}
