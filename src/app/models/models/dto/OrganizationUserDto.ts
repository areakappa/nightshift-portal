export interface OrganizationUserDto {
    id: number;
    idcustomer: number;
    idorganization: number;
    iduser: number;
    day: number;
    startMorningDate: string;
    stopMorningDate: string;
    startAfternoonDate: string | null;
    stopAfternoonDate: string | null;
    state: number;
    created: string;
}

