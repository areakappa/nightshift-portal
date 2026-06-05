import { TeamRoleCoverage } from './TeamRoleCoverage';

export interface TeamCoverage {
    totalRoles: number;
    totalRolesCoverage: number;
    totalRolesToCoverage: number;
    rolesCoverage: TeamRoleCoverage[];
}
