export class EmployeeGroupCrud {
    Idcustomer: number = 0;
    Idcompany: number = 0;
    Idtype: number = 0;
    Idparent: number | null = null;
    Name: string = "";
    Description: string | null = null;
    State: number = 0;
    constructor(idcustomer: number, idcompany: number, idtype: number, idparent: number | null, name: string, description: string, state: number) {
        this.setValues(idcustomer, idcompany, idtype, idparent, name, description, state)
    }

    public setValues(idcustomer: number, idcompany: number, idtype: number, idparent: number | null, name: string, description: string, state: number) {
        this.Idcustomer = idcustomer
        this.Idcompany = idcompany
        this.Idtype = idtype
        this.Idparent = idparent
        this.Name = name
        this.Description = description
        this.State = state
    }
}
