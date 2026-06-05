export class ClientCrud {
    Idorganization: number = 0;
    Idcompany: number = 0;
    RagioneSociale: string = "";
    Name: string = "";
    Description: string = "";
    ClientCode: string = "";
    StartValidityDate: Date = new Date();
    State: number = 1;
    constructor(idorganization: number, idcompany: number, name: string, ragioneSociale: string, description: string, clientcode: string, startvaliditydate: Date, state: number) {
        this.Idorganization = idorganization;
        this.Idcompany = idcompany;
        this.Name = name;
        this.RagioneSociale = ragioneSociale;
        this.Description = description;
        this.ClientCode = clientcode;
        this.StartValidityDate = startvaliditydate;
        this.State = state;
    }
}
