export interface ShiftAutomationCrud {
    id?: number;
    idautomationType: number;
    automationInterval: number;
    startDay: number;
    endDay: number;
    generationDay: number;
    generationHour: number;
    idService?: number;
    state: number;
}

