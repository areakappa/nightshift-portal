import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthenticationService } from './authentication.service';
import { DemoLimitService, LicenseTier } from './demo-limit.service';
import { OrganizationService } from './organization.service';

export interface AccountContext {
    organizationRole: string;
    roleLabel: string;
    tier: LicenseTier;
    tierLabel: string;
    isManager: boolean;
    isOperator: boolean;
}

const EMPTY_CONTEXT: AccountContext = {
    organizationRole: '',
    roleLabel: '',
    tier: 'other',
    tierLabel: '',
    isManager: false,
    isOperator: false
};

@Injectable({ providedIn: 'root' })
export class AccountContextService {
    private readonly contextSubject = new BehaviorSubject<AccountContext>(EMPTY_CONTEXT);
    private refreshPromise: Promise<AccountContext> | null = null;

    readonly context$ = this.contextSubject.asObservable();

    constructor(
        private authenticationService: AuthenticationService,
        private organizationService: OrganizationService,
        private demoLimitService: DemoLimitService
    ) { }

    get snapshot(): AccountContext {
        return this.contextSubject.value;
    }

    async refresh(): Promise<AccountContext> {
        if (this.refreshPromise) return this.refreshPromise;
        this.refreshPromise = this.resolveContext();
        try {
            const context = await this.refreshPromise;
            this.contextSubject.next(context);
            return context;
        } finally {
            this.refreshPromise = null;
        }
    }

    private async resolveContext(): Promise<AccountContext> {
        const user = this.authenticationService.getUser();
        if (!user) return EMPTY_CONTEXT;

        const [tier, organizationRole] = await Promise.all([
            this.demoLimitService.getCurrentLicenseTier().catch(() => 'demo' as LicenseTier),
            this.resolveOrganizationRole(user.id)
        ]);
        const normalizedRole = organizationRole.trim().toLowerCase();
        const isManager = user.isAdmin
            || user.isCustomerAdmin
            || normalizedRole.includes('manager')
            || normalizedRole.includes('supervisor');
        const isOperator = !!user.isUser && !isManager;

        return {
            organizationRole,
            roleLabel: organizationRole || (isManager ? 'Manager' : isOperator ? 'Operatore' : ''),
            tier,
            tierLabel: tier === 'pro' ? 'PRO' : tier === 'demo' ? 'DEMO' : '',
            isManager,
            isOperator
        };
    }

    private async resolveOrganizationRole(userId: number): Promise<string> {
        try {
            const organizationId = this.organizationService.getOrganizationSelectedId();
            const organizations = await this.organizationService.getOrganizationsTeams(userId);
            return organizations.find(item => item.organization?.id === organizationId)
                ?.organizationRole?.name?.trim() ?? '';
        } catch {
            return '';
        }
    }
}
