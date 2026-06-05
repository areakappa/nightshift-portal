import { OrganizationRoleDto } from "../dto/OrganizationRoleDto";
import { ServiceRoleDto } from "../dto/ServiceRoleDto";

export class RoleQuantity {
    role: ServiceRoleDto | OrganizationRoleDto | string;
    quantity: number;
    index: number;
    isNew: boolean;
    constructor(role: ServiceRoleDto | OrganizationRoleDto | string, quantity: number, index: number, isNew: boolean) {
        this.role = role;
        this.quantity = quantity;
        this.index = index;
        this.isNew = isNew;
    }
}
