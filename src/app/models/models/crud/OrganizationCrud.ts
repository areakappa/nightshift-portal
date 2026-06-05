export class OrganizationCrud {
    Name: string = '';
    Description: string = '';
    Region: string = '';
    Ccnlcontract: string = '';
    CcnlcontractDescription: string = '';
    ImagePath: string = '';
    WorkSector: string = '';
    IsTemplate: number = 0;
    Prompt: string = '';
    State: number = 0;

    constructor(
        name: string,
        description: string,
        region: string,
        ccnlContract: string,
        ccnlContractDescription: string,
        imagePath: string,
        workSector: string,
        isTemplate: number,
        prompt: string,
        state: number
    ) {
        this.Name = name;
        this.Description = description;
        this.Region = region;
        this.Ccnlcontract = ccnlContract;
        this.CcnlcontractDescription = ccnlContractDescription;
        this.ImagePath = imagePath;
        this.WorkSector = workSector;
        this.IsTemplate = isTemplate;
        this.Prompt = prompt;
        this.State = state;
    }
}
