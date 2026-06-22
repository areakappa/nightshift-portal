export class ServiceAvailabilityRequestedCrud {
    Idservice: number = 0;
    IdorganizationRole: number | null = null;
    IdserviceRole: number | null = null;
    ConcurrentRequiredQuantity: number = 0;
    SuggestedTeamQuantity: number | null = null;
    State: number = 0;

    constructor(
        idservice: number,
        idorganizationRole: number | null,
        idserviceRole: number | null,
        concurrentRequiredQuantity: number,
        suggestedTeamQuantity: number | null = null,
        state: number = 1
    ) {
        this.Idservice = idservice;
        this.IdorganizationRole = idorganizationRole;
        this.IdserviceRole = idserviceRole;
        this.ConcurrentRequiredQuantity = concurrentRequiredQuantity;
        this.SuggestedTeamQuantity = suggestedTeamQuantity ?? concurrentRequiredQuantity;
        this.State = state;
    }
}
