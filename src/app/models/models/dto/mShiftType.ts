export class mShiftType {
    id?: number;
    idCustomer?: number;
    idCompany?: number;
    idService?: number;
    idDayListType?: number;
    timeOffset?: number;
    resourceRequested?: number;
    nameListType?: string;
    idDayList?: number;
    name?: string;
    description?: string;
    startTime?: string;
    stopTime?: string;
    inspectionNo?: number;
    checkType?: number;
    totalHours?: string;
    startValidityDate?: string;
    stopValidityDate?: string;
    state?: number;
    created?: Date;

    constructor(
        id?: number,
        idCustomer?: number,
        idCompany?: number,
        idService?: number,
        idDayListType?: number,
        timeOffset?: number,
        resourceRequested?: number,
        nameListType?: string,
        idDayList?: number,
        name?: string,
        description?: string,
        startTime?: string,
        stopTime?: string,
        inspectionNo?: number,
        checkType?: number,
        totalHours?: string,
        startValidityDate?: string,
        stopValidityDate?: string,
        state?: number,
        created?: Date
    ) {
        this.id = id;
        this.idCustomer = idCustomer;
        this.idCompany = idCompany;
        this.idService = idService;
        this.idDayListType = idDayListType;
        this.timeOffset = timeOffset;
        this.resourceRequested = resourceRequested;
        this.nameListType = nameListType;
        this.idDayList = idDayList;
        this.name = name;
        this.description = description;
        this.startTime = startTime;
        this.stopTime = stopTime;
        this.inspectionNo = inspectionNo;
        this.checkType = checkType;
        this.totalHours = totalHours;
        this.startValidityDate = startValidityDate;
        this.stopValidityDate = stopValidityDate;
        this.state = state;
        this.created = created;
    }

    getTotalHours(start: string, stop: string): string {
        const startTime = this.parseTime(start);
        const stopTime = this.parseTime(stop);

        if (!startTime || !stopTime) {
            return '00:00';
        }

        let diff = stopTime.getTime() - startTime.getTime();

        if (diff < 0) {
            // Se lo stop è il giorno dopo
            diff += 24 * 60 * 60 * 1000;
        }

        const hours = Math.floor(diff / (60 * 60 * 1000));
        const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    private parseTime(timeString: string): Date | null {
        if (!timeString) return null;

        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }
}
