export class ServiceAvailabilityRequestedCrud {
    Idservice: number = 0;
    IdorganizationRole: number | null = null;
    IdserviceRole: number | null = null;
    Quantity: number = 0;
    State: number = 0;

    constructor(
        idservice: number,
        idorganizationRole: number | null,
        idserviceRole: number | null,
        quantity: number,
        state: number = 1
    ) {
        this.Idservice = idservice;
        this.IdorganizationRole = idorganizationRole;
        this.IdserviceRole = idserviceRole;
        this.Quantity = quantity;
        this.State = state;
    }
}
