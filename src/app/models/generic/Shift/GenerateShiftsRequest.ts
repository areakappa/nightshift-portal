export interface GenerateShiftsRequest {
    serviceId: number;
    periodType: 0 | 1 | 2 | 3 | 4;
    customStartDate?: string;
    customEndDate?: string;
}
