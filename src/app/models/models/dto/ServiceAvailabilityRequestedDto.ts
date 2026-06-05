export interface ServiceAvailabilityRequestedDto {
    id: number;
    idservice: number;
    weekday: number;
    startTimeOffsetMinutes: number;
    endTimeOffsetMinutes: number;
    state: number;
    created: string;
}
