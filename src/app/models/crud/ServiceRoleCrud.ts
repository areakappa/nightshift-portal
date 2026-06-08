export class ServiceRoleCrud {
    Idservice: number = 0;
    Name: string = "";
    Description: string = "";
    StandardRole: number = 0;
    EmployeeNumber: number = 1;
    State: number = 1;
    constructor(name: string, description: string, standardRole: number, state: number, employeeNumber: number = 1) {
        this.Name = name;
        this.Description = description;
        this.StandardRole = standardRole;
        this.EmployeeNumber = employeeNumber;
        this.State = state;
    }
}
