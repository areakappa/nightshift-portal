import { Injectable } from '@angular/core';
import { BillingPlanDto } from '../models/dto/BillingPlanDto';
import { ServiceDTO } from '../models/dto/serviceDTO';
import { AuthenticationService } from './authentication.service';
import { BillingApiService } from './billing-api.service';
import { OrganizationService } from './organization.service';
import { ServicesService } from './services.service';

export interface DemoServiceLimitOptions {
    orgId?: number;
    services?: ServiceDTO[];
}

export type LicenseTier = 'demo' | 'pro' | 'other';

@Injectable({ providedIn: 'root' })
export class DemoLimitService {
    private billingPlansCache: BillingPlanDto[] | null = null;

    constructor(
        private authenticationService: AuthenticationService,
        private billingApiService: BillingApiService,
        private organizationService: OrganizationService,
        private servicesService: ServicesService
    ) { }

    async getCurrentLicenseTier(): Promise<LicenseTier> {
        const user = this.authenticationService.getUser();
        if (!user?.id) {
            return 'other';
        }

        try {
            const isPro = await this.billingApiService.isProActive();
            return isPro ? 'pro' : 'demo';
        } catch {
            return 'demo';
        }
    }

    async getMaxServices(orgId?: number): Promise<number | null> {
        const plan = await this.getCurrentOrganizationBillingPlan(orgId);
        return this.normalizeLimit(plan?.maxServices);
    }

    async getMaxUsersPerService(orgId?: number): Promise<number | null> {
        const plan = await this.getCurrentOrganizationBillingPlan(orgId);
        return this.normalizeLimit(plan?.maxUsersPerService);
    }

    async isDemoServiceLimitReached(options?: DemoServiceLimitOptions): Promise<boolean> {
        const user = this.authenticationService.getUser();
        if (!user?.id) {
            return false;
        }

        try {
            const orgId = options?.orgId ?? this.organizationService.getOrganizationSelectedId();
            if (!orgId) {
                return false;
            }

            const maxServices = await this.getMaxServices(orgId);
            if (maxServices === null) {
                return false;
            }

            const services = options?.services && options.services.length > 0
                ? options.services
                : await this.servicesService.getServicesbyIDOrganization(orgId);

            return services.length >= maxServices;
        } catch (error) {
            console.warn('isDemoServiceLimitReached() ERROR:: ', error);
            return false;
        }
    }

    async isConfiguredTeamLimitReached(currentServiceId: number, options?: DemoServiceLimitOptions): Promise<boolean> {
        const user = this.authenticationService.getUser();
        if (!user?.id || !Number.isFinite(currentServiceId) || currentServiceId <= 0) {
            return false;
        }

        try {
            const orgId = options?.orgId ?? this.organizationService.getOrganizationSelectedId();
            if (!orgId) {
                return false;
            }

            const maxServices = await this.getMaxServices(orgId);
            if (maxServices === null) {
                return false;
            }

            const services = options?.services && options.services.length > 0
                ? options.services
                : await this.servicesService.getServicesbyIDOrganization(orgId);

            const configuredTeamsCount = services.filter(
                service => (service.servicesAvailabilityRequested?.length ?? 0) > 0
            ).length;
            const currentServiceHasTeam = services.some(
                service => service.id === currentServiceId && (service.servicesAvailabilityRequested?.length ?? 0) > 0
            );

            return configuredTeamsCount >= maxServices && !currentServiceHasTeam;
        } catch (error) {
            console.warn('isConfiguredTeamLimitReached() ERROR:: ', error);
            return false;
        }
    }

    private async getCurrentOrganizationBillingPlan(orgId?: number): Promise<BillingPlanDto | null> {
        const organizationId = orgId ?? this.organizationService.getOrganizationSelectedId();
        if (!organizationId) {
            return null;
        }

        const billingPlanId = await this.getOrganizationBillingPlanId(organizationId);
        if (billingPlanId === null) {
            return null;
        }

        const plans = await this.getBillingPlans();
        return plans.find(plan => Number(plan.id) === billingPlanId) ?? null;
    }

    private async getOrganizationBillingPlanId(orgId: number): Promise<number | null> {
        const organizations = await this.organizationService.getOrganizations();
        const selectedOrganization = organizations.find(org => org.id === orgId);
        const rawPlanId = selectedOrganization?.idbillingPlan ?? null;

        if (rawPlanId === null || rawPlanId === undefined) {
            return null;
        }

        const numericPlanId = Number(rawPlanId);
        return Number.isFinite(numericPlanId) ? numericPlanId : null;
    }

    private async getBillingPlans(): Promise<BillingPlanDto[]> {
        if (this.billingPlansCache) {
            return this.billingPlansCache;
        }

        this.billingPlansCache = await this.billingApiService.getBillingPlans();
        return this.billingPlansCache;
    }

    private normalizeLimit(value: number | null | undefined): number | null {
        if (value === null || value === undefined) {
            return null;
        }

        const numericValue = Number(value);
        return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : null;
    }
}
