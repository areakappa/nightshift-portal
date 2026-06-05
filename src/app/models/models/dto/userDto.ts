import { CustomerDto } from './CustomerDto';
import { OrganizationUserDto } from './OrganizationUserDto';
import { RoleDto } from './roleDto';

export interface UserDto {
    id: number | null;
    idcustomer: number | null;
    idrole: number | null;
    name: string | null;
    surname: string | null;
    email: string | null;
    username: string | null;
    clearPassword: string | null;
    defaultPassword: boolean | null;
    avatarPath: string | null;
    timezone: number | null;
    language: string | null;
    firstPassword: number;
    receiveEmailNotification: number | null;
    receiveAppNotification: number | null;
    state: number | null;
    created: string | null;
    idcustomerNavigation: CustomerDto | null;
    idroleNavigation: RoleDto | null;
    organizationUsers: OrganizationUserDto[];
}
