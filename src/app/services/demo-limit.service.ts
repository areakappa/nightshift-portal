import { Injectable } from '@angular/core';
import { ServiceDTO } from '../models/dto/serviceDTO';
import { AuthenticationService } from './authentication.service';
import { BillingApiService } from './billing-api.service';
import { OrganizationService } from './organization.service';
import { ServicesService } from './services.service';

export interface DemoServiceLimitOptions {
  orgId?: number;
  services?: ServiceDTO[];
  requireDemoCheck?: boolean;
}

const BILLING_PLAN_CUSTOM = 4;
export type LicenseTier = 'demo' | 'pro' | 'other';

@Injectable({
  providedIn: 'root',
})
export class DemoLimitService {
  constructor(
    private authenticationService: AuthenticationService,
    private billingApiService: BillingApiService,
    private organizationService: OrganizationService,
    private servicesService: ServicesService
  ) {}

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

  async getMaxUsersPerService(): Promise<number | null> {
    const tier = await this.getCurrentLicenseTier();
    if (tier === 'demo') {
      return 5;
    }
    if (tier === 'pro') {
      return 10;
    }
    return null;
  }

  async isOrganizationCreationLimitReached(): Promise<boolean> {
    const tier = await this.getCurrentLicenseTier();
    if (tier !== 'demo' && tier !== 'pro') {
      return false;
    }

    try {
      const user = this.authenticationService.getUser();
      if (!user?.id) {
        return false;
      }

      const organizationsTeams = await this.organizationService.getOrganizationsTeams(user.id);
      const supervisedOrganizations = organizationsTeams.filter((team) => {
        const organization = team?.organization;
        if (!organization) {
          return false;
        }

        const isTemplate = Number(organization.isTemplate) === 1;
        const isActive = Number(organization.state ?? 0) === 1;
        if (isTemplate || !isActive) {
          return false;
        }

        const roleName = (team.organizationRole?.name ?? '').trim().toLowerCase();
        return roleName === 'organizationsupervisor' || roleName.includes('supervisor');
      });

      return supervisedOrganizations.length >= 1;
    } catch (error) {
      console.warn('isOrganizationCreationLimitReached() ERROR:: ', error);
      return false;
    }
  }

  async isDemoServiceLimitReached(options?: DemoServiceLimitOptions): Promise<boolean> {
    const user = this.authenticationService.getUser();
    if (!user?.id) {
      return false;
    }

    try {
      if (options?.requireDemoCheck) {
        const isDemo = await this.organizationService.checkDemoExpirationByUser(user.id);
        if (!isDemo) {
          return false;
        }
      }

      const orgId = options?.orgId ?? this.organizationService.getOrganizationSelectedId();
      if (!orgId) {
        return false;
      }

      const tier = await this.getCurrentLicenseTier();
      if (tier === 'other') {
        return false;
      }

      const billingPlanId = await this.getOrganizationBillingPlanId(orgId);
      if (tier === 'pro' && billingPlanId === BILLING_PLAN_CUSTOM) {
        return false;
      }

      const services =
        options?.services && options.services.length > 0
          ? options.services
          : await this.servicesService.getServicesbyIDOrganization(orgId);

      return services.length >= 1;
    } catch (error) {
      console.warn('isDemoServiceLimitReached() ERROR:: ', error);
      return false;
    }
  }

  private async getOrganizationBillingPlanId(orgId: number): Promise<number | null> {
    const organizations = await this.organizationService.getOrganizations();
    const selectedOrganization = organizations.find((org) => org.id === orgId) as
      | (Record<string, unknown> & { id?: number })
      | undefined;

    if (!selectedOrganization) {
      return null;
    }

    const rawPlanId = selectedOrganization['idbillingPlan'] ?? null;      

    if (rawPlanId === null || rawPlanId === undefined) {
      return null;
    }

    const numericPlanId = Number(rawPlanId);
    return Number.isFinite(numericPlanId) ? numericPlanId : null;
  }
}
