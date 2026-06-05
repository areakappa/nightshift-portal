import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { BillingEventDto } from '../models/dto/BillingEventDto';
import { BillingSubscriptionDto } from '../models/dto/BillingSubscriptionDto';
import { Utility } from '../models/utility';

@Injectable({
    providedIn: 'root',
})
export class BillingApiService {
    private billingUrl: string = `${environment.api}/api/billing`;

    constructor(private http: HttpClient) { }

    public async getMySubscription(): Promise<BillingSubscriptionDto | null> {
        return await firstValueFrom(
            this.http.get<BillingSubscriptionDto | null>(
                `${this.billingUrl}/GetMySubscription`,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async getMyEvents(take: number = 100): Promise<BillingEventDto[]> {
        return await firstValueFrom(
            this.http.get<BillingEventDto[]>(
                `${this.billingUrl}/GetMyEvents?take=${take}`,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async isProActive(): Promise<boolean> {
        const subscription = await this.getMySubscription();
        if (!subscription) {
            return false;
        }

        const stateName = (subscription.subscriptionStateName ?? '').trim().toUpperCase();
        if (stateName === 'ACTIVE' || stateName === 'GRACE_PERIOD' || stateName === 'CANCELED') {
            return true;
        }

        const periodStop = subscription.currentPeriodStop ? new Date(subscription.currentPeriodStop) : null;
        if (periodStop && !Number.isNaN(periodStop.getTime()) && periodStop.getTime() > Date.now()) {
            return true;
        }

        return false;
    }
}
