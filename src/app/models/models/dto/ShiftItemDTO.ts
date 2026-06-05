export interface ShiftItemDTO {
    startDateTime: string;
    endDateTime: string;
    idEmployee: number | null;
    idUser: number | null;
    idShift: number | null;
    nameEmployee: string | null;
    nameClient: string | null;
    addressfield1: string | null;
    addressfield2: string | null;
    addressfield3: string | null;
    nameServiceType: string | null;
    roleName?: string | null;
    nameRole?: string | null;
    role?: string | null;
    employeeRoleName?: string | null;
    organizationRoleName?: string | null;
    serviceRole:string| null;
}

