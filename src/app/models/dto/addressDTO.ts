export interface AddressDTO {
    id: number;
    idaddressType: number;
    address1: string;
    civico: string;
    barra: string | undefined;
    comune: string | undefined;
    idprovincia: number | undefined;
    cap: string | undefined;
    localita: string | undefined;
    piano: number | undefined;
    porta: string | undefined;
    mapX: number | undefined;
    mapY: number | undefined;
    state: number;
    created: string;
}
