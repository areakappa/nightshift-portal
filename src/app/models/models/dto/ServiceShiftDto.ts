export interface ServiceShiftDto {
    id: number;
    idorganization: number;
    idservice: number;
    idshiftType: number;
    shiftTypeName: string | null;
    shiftTypeDescription: string | null;
    startMorningDate: string;
    stopMorningDate: string;
    startAfternoonDate: string | null;
    stopAfternoonDate: string | null;
    day: number;
    startDate: string | null;
    stopDate: string | null;
    state: number;
    created: string;
}
