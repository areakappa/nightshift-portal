export interface BillingSubscriptionDto {
    id: number;
    iduser: number | null;
    idsubState: number | null;
    subscriptionStateName: string | null;
    identitlement: string | null;
    idproduct: string | null;
    idlastEvent: string | null;
    currentPeriodStart: string | null;
    currentPeriodStop: string | null;
    willRenew: number | null;
    storeAccountRef: string | null;
    created: string;
}