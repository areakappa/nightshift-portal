import { OrganizationRoleDto } from '../../dto/OrganizationRoleDto';
import { ServiceRoleDto } from '../../dto/ServiceRoleDto';
import { UserDto } from '../../dto/userDto';

export interface TeamRoleCoverage {
    isCovered: boolean;
    user: UserDto | null;
    hasAccount: boolean;
    isExtra?: boolean;
    serviceRole: ServiceRoleDto;
    roleIndex: number;
    idTeamContent: number | null;
}
