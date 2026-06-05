export class OrganizationRoleCrud {
    Idorganization: number = 0;
    Name: string = '';
    Description: string = '';
    StandardRole: number = 0;
    State: number = 0;

    constructor(
        idorganization: number,
        name: string,
        description: string,
        standardRole: number,
        state: number
    ) {
        this.Idorganization = idorganization;
        this.Name = name;
        this.Description = description;
        this.StandardRole = standardRole;
        this.State = state;
    }
}
