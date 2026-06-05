import { OrganizationDto } from './OrganizationDto';
import { OrganizationRoleDto } from './OrganizationRoleDto';

export interface OrganizationTeamDto {
    id: number;
    idorganization: number;
    organization: OrganizationDto | null;
    iduser: number;
    idorganizationRole: number;
    organizationRole: OrganizationRoleDto | null;
    state: number;
    created: string;
}
