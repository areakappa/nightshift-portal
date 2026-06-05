export interface ServiceRoleDto {
    id: number;
    idservice: number;
    idorganizationRole: number;
    name: string | null;
    description: string | null;
    standardRole: number | null;
    employeeNumber: number;
    state: number;
    created: string;
}
