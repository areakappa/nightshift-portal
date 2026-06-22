export interface ServiceAvailabilityRequestedDto {
    id: number;
    idservice: number;
    idserviceRole?: number | null;
    idorganizationRole?: number | null;
    concurrentRequiredQuantity: number;
    suggestedTeamQuantity?: number | null;
    state: number;
    created: string;
}
