export interface BillingPlanDto {
    id: number;
    name?: string | null;
    description?: string | null;
    maxUsersPerService?: number | null;
    maxServices?: number | null;
    state: number;
    created: string;
}
