export interface mStation {
    id?: number | null;
    idClient?: number | null;
    idAddress?: number | null;
    name?: string | null;
    description?: string | null;
    address?: string | null;
    idaddressType: number;
    addressType?: string | null;
    approximativeGPSCoordinate?: number | null;
    cap?: string | null;
    city?: string | null;
    piano?: number | null;
    porta?: string | null;
    mapX?: number | null;
    civico: string;
    barra?: string | null;
    comune?: string | null;
    idProvincia?: number | null;
    localita?: string | null;
    mapY?: number | null;
    state?: number | null;
    created?: Date | string | null;
}
