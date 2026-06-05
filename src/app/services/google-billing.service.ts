import { Injectable } from '@angular/core';
import { AuthenticationService } from './authentication.service';

type BillingResult = {
    success: boolean;
    cancelled?: boolean;
    pending?: boolean;
    message: string;
};

@Injectable({ providedIn: 'root' })
export class GoogleBillingService {
    constructor(private authenticationService: AuthenticationService) { }

    public isBillingEnabled(): boolean {
        return false; // Billing nativo non disponibile in web
    }

    public getCheckoutStoreLabel(): string {
        return 'store';
    }

    public async purchasePro(): Promise<BillingResult> {
        return { success: false, message: 'Acquisto in-app non disponibile nel portale web.' };
    }

    public async restorePurchases(): Promise<BillingResult> {
        return { success: false, message: 'Ripristino acquisti non disponibile nel portale web.' };
    }

    public async isProActive(): Promise<boolean> {
        return false;
    }
}
