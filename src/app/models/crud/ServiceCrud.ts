export class ServiceCrud {
    Idorganization: number;
    Idcompany: number;
    Idclient: number;
    Idcontract?: number | null;
    IdserviceType: number;
    IdserviceSubType?: number | null;
    IdserviceStation?: number | null;
    Idgroup?: number | null;
    Name: string;
    Description: string;
    StartValidityDate: string;
    StopValidityDate?: string | null;
    WeekHours?: number | null;
    MonthHours?: number | null;
    InvoiceGroupTag?: string | null;
    State: number;
    IdaddressType?: number | null;
    Address1?: string | null;
    Civico?: string | null;
    Barra?: string | null;
    Comune?: string | null;
    Idprovincia?: number | null;
    CapServiceStation?: number | null;
    Localita?: string | null;
    ApproximativeGPSCoordinate?: number | null;
    Porta?: string | null;
    Piano?: number | null;
    MapX?: number | null;
    MapY?: number | null;
    NameServiceStation?: string | null;
    DescriptionStation?: string | null;
    AddressServiceStation?: string | null;
    CityServiceStation?: string | null;

    constructor(idorganization: number, idcompany: number, idclient: number, idserviceType: number, name: string, description: string, startvaliditydate: string, state: number) {
        this.Idorganization = idorganization;
        this.Idcompany = idcompany;
        this.Idclient = idclient;
        this.IdserviceType = idserviceType;
        this.Name = name;
        this.Description = description;
        this.StartValidityDate = startvaliditydate;
        this.State = state;
    }
}
