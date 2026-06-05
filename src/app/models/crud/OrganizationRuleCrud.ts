export class OrganizationRuleCrud {
    Idcustomer: number = 0;
    Idorganization: number = 0;
    RuleOrException: string = '';
    RuleOrExceptionDescription: string = '';
    State: number = 0;

    constructor(
        idcustomer: number,
        idorganization: number,
        ruleOrException: string,
        ruleOrExceptionDescription: string,
        state: number
    ) {
        this.Idcustomer = idcustomer;
        this.Idorganization = idorganization;
        this.RuleOrException = ruleOrException;
        this.RuleOrExceptionDescription = ruleOrExceptionDescription;
        this.State = state;
    }
}
