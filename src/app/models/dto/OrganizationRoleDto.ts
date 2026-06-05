export interface OrganizationRoleDto {
    id: number;
    idorganization: number;
    name: string;
    description: string | null;
    state: number;
    created: string;
}
