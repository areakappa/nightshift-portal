export class ServiceRoleCrud {
    Idservice: number = 0;
    Name: string = "";
    Description: string = "";
    StandardRole: number = 0;
    State: number = 1;
    constructor(name: string, description: string, standardRole: number, state: number) {
        this.Name = name;
        this.Description = description;
        this.StandardRole = standardRole;
        this.State = state;
    }
}
