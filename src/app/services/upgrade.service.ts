import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BillingSubscriptionDto } from '../models/dto/BillingSubscriptionDto';
import { BillingApiService } from './billing-api.service';
import { GoogleBillingService } from './google-billing.service';

@Injectable({ providedIn: 'root' })
export class UpgradeService {
    constructor(
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private googleBillingService: GoogleBillingService,
        private billingApiService: BillingApiService
    ) { }

    public async presentUpgradeFlow(limitMessage: string, options?: { contactOnly?: boolean }): Promise<boolean> {
        const contactOnly = options?.contactOnly === true;
        const message = contactOnly
            ? `${limitMessage}\n\nPer estendere i limiti contatta il team.`
            : `${limitMessage}\n\nIl billing in-app non è disponibile sul portale web. Contatta il team per l'upgrade.`;

        this.snackBar.open(message, 'Chiudi', { duration: 6000 });

        if (!contactOnly) {
            this.openContactTeamEmail();
        }
        return false;
    }

    public async startDirectProCheckout(): Promise<boolean> {
        this.snackBar.open('Acquisto in-app non disponibile nel portale web. Contatta il team.', 'Chiudi', { duration: 5000 });
        this.openContactTeamEmail();
        return false;
    }

    public async startRestorePurchases(): Promise<boolean> {
        this.snackBar.open('Ripristino acquisti non disponibile nel portale web.', 'Chiudi', { duration: 4000 });
        return false;
    }

    private openContactTeamEmail(): void {
        window.open('mailto:support@areakappa.it?subject=Upgrade%20NightShift%20PRO', '_blank');
    }

    private async waitForBackendSubscriptionSync(
        maxAttempts = 4,
        delayMs = 1500
    ): Promise<BillingSubscriptionDto | null> {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const subscription = await this.billingApiService.getMySubscription();
                if (subscription) return subscription;
            } catch {
                // Ignore transient errors during sync
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        return null;
    }
}
