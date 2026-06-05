import { OrganizationRoleDto } from "./OrganizationRoleDto";
import { UserDto } from "./userDto";

export interface TeamContentDto {
    id: number;
    idteam: number | null;
    iduser: number;
    idorganizationRole: number | null;
    idsystemRole: number | null;
    role: OrganizationRoleDto | null;
    user: UserDto | null;
    state: number;
    created: string;
}
