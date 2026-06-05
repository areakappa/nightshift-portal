import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
    selector: 'app-initial',
    standalone: true,
    imports: [CommonModule, MatProgressSpinnerModule],
    template: `
      <div class="initial-screen">
        <div class="initial-logo">NS</div>
        <div class="initial-title">NightShift</div>
        <mat-spinner diameter="32" color="accent"></mat-spinner>
      </div>
    `,
    styles: [`
      .initial-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: var(--ns-gradient, linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%));
        gap: 16px;
      }
      .initial-logo {
        width: 80px; height: 80px; border-radius: 20px;
        background: rgba(255,255,255,0.15);
        display: flex; align-items: center; justify-content: center;
        font-size: 28px; font-weight: 700; color: #fff;
      }
      .initial-title {
        font-size: 28px; font-weight: 700; color: #fff;
      }
    `]
})
export class InitialComponent implements OnInit {
    constructor(private authService: AuthenticationService, private router: Router) { }

    async ngOnInit(): Promise<void> {
        const loggedIn = await this.authService.checkAndLogIn();
        if (!loggedIn) {
            await this.router.navigate(['/login']);
        }
    }
}
