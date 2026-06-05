export class AddressCrud {
    IdaddressType: number = 0;
    Address1: string = "";
    Civico: string = "";
    Barra: string | null = null;
    Comune: string | null = null;
    Idprovincia: number | null = null;
    Cap: string | null = null;
    Localita: string | null = null;
    Idnation: number | null = null;
    Piano: number | null = null;
    Porta: string | null = null;
    MapX: number | null = null;
    MapY: number | null = null;
    ApproximativeGpscoordinate: number = 0;
    State: number = 0;

    // Overload 1: costruttore completo
    constructor(
        idaddresstype: number,
        address: string,
        civico: string,
        barra: string | null,
        comune: string | null,
        idprovincia: number | null,
        cap: string | null,
        localita: string | null,
        idnation: number | null,
        piano: number | null,
        porta: string | null,
        mapx: number | null,
        mapy: number | null,
        approximativeGpscoordinate: number,
        state: number
    );

    // Overload 2: costruttore ridotto con solo address, mapx e mapy
    constructor(address: string, mapx: number | null, mapy: number | null);

    // Implementazione unica
    constructor(
        idaddresstypeOrAddress: number | string,
        addressOrMapx?: string | number | null,
        civicoOrMapy?: string | number | null,
        barra?: string | null,
        comune?: string | null,
        idprovincia?: number | null,
        cap?: string | null,
        localita?: string | null,
        idnation?: number | null,
        piano?: number | null,
        porta?: string | null,
        mapx?: number | null,
        mapy?: number | null,
        approximativeGpscoordinate?: number,
        state?: number
    ) {
        // Caso 1 → costruttore ridotto: (address, mapx, mapy)
        if (typeof idaddresstypeOrAddress === "string") {
            this.Address1 = idaddresstypeOrAddress;
            this.MapX = (addressOrMapx as number) ?? null;
            this.MapY = (civicoOrMapy as number) ?? null;
            this.IdaddressType = 1;
            this.State = 1;
        }
        // Caso 2 → costruttore completo
        else {
            this.IdaddressType = idaddresstypeOrAddress ?? 0;
            this.Address1 = (addressOrMapx as string) ?? "";
            this.Civico = (civicoOrMapy as string) ?? "";
            this.Barra = barra ?? null;
            this.Comune = comune ?? null;
            this.Idprovincia = idprovincia ?? null;
            this.Cap = cap ?? null;
            this.Localita = localita ?? null;
            this.Idnation = idnation ?? null;
            this.Piano = piano ?? null;
            this.Porta = porta ?? null;
            this.MapX = mapx ?? null;
            this.MapY = mapy ?? null;
            this.ApproximativeGpscoordinate = approximativeGpscoordinate ?? 0;
            this.State = state ?? 0;
        }
    }
}
