export interface TeamSizeEstimateRequest {
    idservice: number;
    roles: TeamSizeEstimateRoleRequest[];
}

export interface TeamSizeEstimateRoleRequest {
    idserviceRole: number;
    concurrentRequired: number;
}

export interface TeamSizeEstimateResponse {
    idservice: number;
    contractWeeklyHours: number;
    weeklyServiceHours: number;
    ccnl: string;
    summary: string;
    assumptions: string[];
    roles: TeamSizeEstimateRoleResponse[];
}

export interface TeamSizeEstimateRoleResponse {
    idserviceRole: number;
    roleName: string;
    concurrentRequired: number;
    weeklyRequiredHours: number;
    suggestedTeamMembers: number;
    reason: string;
}
