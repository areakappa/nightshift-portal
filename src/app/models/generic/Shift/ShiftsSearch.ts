export class ShiftsSearch {
    IdService: number | null;
    Start: string;
    Stop: string;
    IdsUsers: number[] | null;
    constructor(idService: number | null, start: string, stop: string, idsUsers: number[] | null = null) {
        this.IdService = idService;
        this.Start = start;
        this.Stop = stop;
        this.IdsUsers = idsUsers;
    }
}

