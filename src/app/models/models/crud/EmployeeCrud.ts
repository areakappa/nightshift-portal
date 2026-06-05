export class EmployeeCrud {
    Idcustomer: number;
    Idcompany: number;
    IdemployeeRole?: number | null;
    EmployeeRoleName?: string | null;
    SerialNo?: string | null;
    Name: string;
    Surname: string;
    Email?: string | null;
    State: number;
    constructor(idcustomer: number, idcompany: number, idemployeeRole: number | null, employeeRoleName: string | null, serialNo: string | null, name: string, surname: string, email: string | null, state: number) {
        this.Idcustomer = idcustomer;
        this.Idcompany = idcompany;
        this.IdemployeeRole = idemployeeRole;
        this.EmployeeRoleName = employeeRoleName;
        this.SerialNo = serialNo;
        this.Name = name;
        this.Surname = surname;
        this.Email = email;
        this.State = state;
    }
}
