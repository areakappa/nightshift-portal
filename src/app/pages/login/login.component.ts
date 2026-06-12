import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '../../services/authentication.service';
import { DemoService } from '../../services/demo.service';
import { KEEP_ACCESS_KEY, USERNAME_KEY, PASSWORD_KEY } from '../../services/authentication.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatCheckboxModule,
        MatProgressSpinnerModule, MatSnackBarModule
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
    username = new FormControl('', [Validators.required]);
    password = new FormControl('', [Validators.required]);
    keepAccess = true;
    showPassword = false;
    submitProcess = false;
    showResendActivation = false;
    resendProcess = false;
    errorMessage: string | undefined;

    constructor(
        private authService: AuthenticationService,
        private demoService: DemoService,
        private router: Router,
        private route: ActivatedRoute,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        this.restorePreferences();
    }

    private restorePreferences(): void {
        const saved = localStorage.getItem(USERNAME_KEY);
        const keepVal = localStorage.getItem(KEEP_ACCESS_KEY);
        if (saved) this.username.setValue(saved);
        this.keepAccess = keepVal !== 'false';
    }

    async login(): Promise<void> {
        if (this.submitProcess || this.username.invalid || this.password.invalid) return;
        this.submitProcess = true;
        this.errorMessage = undefined;
        this.showResendActivation = false;

        try {
            await this.authService.login(this.username.value!, this.password.value!);
            if (this.keepAccess) {
                localStorage.setItem(KEEP_ACCESS_KEY, 'true');
                localStorage.setItem(USERNAME_KEY, this.username.value!);
                localStorage.setItem(PASSWORD_KEY, this.password.value!);
            } else {
                localStorage.setItem(KEEP_ACCESS_KEY, 'false');
                localStorage.removeItem(USERNAME_KEY);
                localStorage.removeItem(PASSWORD_KEY);
            }
        } catch (err: any) {
            const msg: string = err?.error?.body ?? err?.message ?? 'Credenziali non valide';
            this.errorMessage = msg;
            if (msg.toLowerCase().includes('attiv') || msg.toLowerCase().includes('verif')) {
                this.showResendActivation = true;
            }
        } finally {
            this.submitProcess = false;
        }
    }

    async resendActivationEmail(): Promise<void> {
        if (this.resendProcess || this.username.invalid) return;
        this.resendProcess = true;
        try {
            await this.demoService.resendActivationEmail(this.username.value!);
            this.snackBar.open('Email di attivazione inviata!', 'Ok', { duration: 4000 });
        } catch (e) {
            this.snackBar.open('Errore nell\'invio. Riprova.', 'Chiudi', { duration: 4000 });
        } finally {
            this.resendProcess = false;
        }
    }

    isFormValid(): boolean {
        return this.username.valid && this.password.valid;
    }

    goToRegister(): void {
        this.router.navigate(['/register']);
    }

    goToForgotPassword(): void {
        this.router.navigate(['/forgot-password']);
    }
}
