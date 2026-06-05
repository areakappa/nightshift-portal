export class CompanyContractEmployeeRuleCrud {
    Idcustomer: number;
    IdcompanyContractMaster: number = 0;
    Idemployee: number;
    RuleOrException: string;
    State: number;

    constructor(idcustomer: number, idemployee: number, ruleOrException: string, state: number) {
        this.Idcustomer = idcustomer;
        this.Idemployee = idemployee;
        this.RuleOrException = ruleOrException;
        this.State = state;
    }
}
