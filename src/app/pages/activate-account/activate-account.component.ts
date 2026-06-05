import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DemoService } from '../../services/demo.service';

@Component({
    selector: 'app-activate-account',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
    templateUrl: './activate-account.component.html',
    styleUrls: ['./activate-account.component.scss']
})
export class ActivateAccountComponent implements OnInit {
    loading = true;
    success = false;
    error = '';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private demoService: DemoService
    ) { }

    async ngOnInit(): Promise<void> {
        const token = this.route.snapshot.queryParamMap.get('token');
        if (!token) {
            this.loading = false;
            this.error = 'Token di attivazione mancante.';
            return;
        }
        try {
            const ok = await this.demoService.activateAccount(token);
            this.success = ok;
            if (!ok) this.error = 'Token non valido o già utilizzato.';
        } catch (e: any) {
            this.error = e?.error?.body ?? 'Errore durante l\'attivazione.';
        } finally {
            this.loading = false;
        }
    }

    goToLogin(): void {
        this.router.navigate(['/login']);
    }
}
