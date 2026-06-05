import { AddressCrud } from "../crud/AddressCrud";
import { ClientCrud } from "../crud/ClientCrud";
import { CompanyContractEmployeeRuleCrud } from "../crud/CompanyContractEmployeeRuleCrud";
import { EmployeeCrud } from "../crud/EmployeeCrud";
import { EmployeeGroupCrud } from "../crud/EmployeeGroupCrud";
import { ServiceCrud } from "../crud/ServiceCrud";
import { ServiceRoleCrud } from "../crud/ServiceRoleCrud";
import { ServiceShiftCrud } from "../crud/ServiceShiftCrud";
import { ShiftTypeCrud } from "../crud/ShiftTypeCrud";
import { UserCrud } from "../crud/UserCrud";

export class DemoInformations {
    Client: ClientCrud | null = null;
    IdClientSelected: number | null = null;
    IdOrganization: number | null = null;
    Service: ServiceCrud | null = null;
    Address: AddressCrud | null = new AddressCrud("", null, null);
    Roles: ServiceRoleCrud[] = [];
    ShiftTypes: ShiftTypeCrud[] = [];
    ServiceTeamUsersIds: number[] = [];
    ServiceShifts: ServiceShiftCrud[] = [];
    EmployeeGroup: EmployeeGroupCrud | null = null;
    Employees: EmployeeCrud[] = [];
    Users: UserCrud[] = [];
    CompanyContractEmployeeRules: CompanyContractEmployeeRuleCrud[] = [];
    CompanyContractRules: CompanyContractEmployeeRuleCrud[] = [];
}
