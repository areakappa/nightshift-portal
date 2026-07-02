import { OrganizationRuleDto } from './OrganizationRuleDto';

export interface OrganizationDto {
    id: number;
    name: string;
    description: string | null;
    isTemplate: number;
    region: string | null;
    ccnlcontract: string | null;
    ccnlcontractDescription: string | null;
    imagePath: string | null;
    workSector: string | null;
    idbillingPlan?: number | null;
    rules: OrganizationRuleDto[];
    prompt: string | null;
    state: number;
    created: string;
}
