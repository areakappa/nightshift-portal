export class ServiceShiftCrud {
    Idorganization: number = 0;
    Idservice: number = 0;
    StartMorningDate: string = '';
    StopMorningDate: string = '';
    StartAfternoonDate: string = '';
    StopAfternoonDate: string = '';
    Day: number = 0;
    StartDate: string = '';
    StopDate: string = '';
    State: number = 1;

    constructor(
        idOrganization: number,
        idService: number,
        startMorningTime: string,
        stopMorningTime: string,
        startAfternoonTime: string,
        stopAfternoonTime: string,
        day: number,
        startDate: string,
        stopDate: string,
        state: number
    ) {
        this.Idorganization = idOrganization;
        this.Idservice = idService;
        this.StartMorningDate = startMorningTime;
        this.StopMorningDate = stopMorningTime;
        this.StartAfternoonDate = startAfternoonTime;
        this.StopAfternoonDate = stopAfternoonTime;
        this.Day = day;
        this.StartDate = startDate;
        this.StopDate = stopDate;
        this.State = state;
    }
}
