export interface OrganizationRuleDto {
    id: number;
    idcustomer: number;
    idorganization: number;
    ruleOrException: string;
    ruleOrExceptionDescription: string | null;
    state: number;
    created: string;
}
