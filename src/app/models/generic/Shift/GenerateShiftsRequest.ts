export interface GenerateShiftsRequest {
    serviceId: number;
    periodType: 0 | 1 | 2 | 3 | 4;
    customStartDate?: string;
    customEndDate?: string;
    targetStartDateTimeUtc?: string;
    targetEndDateTimeUtc?: string;
    excludedUserIds?: number[];
    forcePreviewGeneration?: boolean;
}
