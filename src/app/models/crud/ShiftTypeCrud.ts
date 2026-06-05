export class ShiftTypeCrud {
    Id?: number;
    Idcustomer: number = 0;
    Idcompany: number = 0;
    Idservice: number = 0;
    IddayListType: number = 0;
    IddayList: number | null = null;
    Name: string = "";
    Description: string = "";
    StartTime: string = "";
    StopTime: string | null = null;
    RequestedResourceNo: number = 0;
    StartValidityDate: string | null = null;
    StopValidityDate: string | null = null;
    InspectionNo: number = 0;
    CheckType: number = 0;
    State: number = 0;
    constructor(idcustomer: number,
        idcompany: number,
        idservice: number,
        iddaylistType: number,
        iddaylist: number | null,
        name: string,
        description: string,
        starttime: string,
        stoptime: string | null,
        resourceno: number,
        checktype: number,
        startvaliditydate: string | null,
        stopvaliditydate: string | null,
        state: number,
        inspectionno: number,
        id?: number
    ) {
        this.Id = id;
        this.Idcustomer = idcustomer
        this.Idcompany = idcompany
        this.Idservice = idservice
        this.IddayListType = iddaylistType
        this.IddayList = iddaylist
        this.Name = name
        this.Description = description
        this.StartTime = starttime
        this.StopTime = stoptime
        this.RequestedResourceNo = resourceno
        this.CheckType = checktype
        this.StartValidityDate = startvaliditydate
        this.StopValidityDate = stopvaliditydate
        this.State = state
        this.InspectionNo = inspectionno;
    }
}
