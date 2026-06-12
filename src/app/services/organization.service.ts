import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { Utility } from '../models/utility';
import { OrganizationCrud } from '../models/crud/OrganizationCrud';
import { OrganizationDto } from '../models/dto/OrganizationDto';
import { OrganizationRuleCrud } from '../models/crud/OrganizationRuleCrud';
import { OrganizationTeamDto } from '../models/dto/OrganizationTeamDto';
import { UserDto } from '../models/dto/userDto';
import { OrganizationRoleDto } from '../models/dto/OrganizationRoleDto';
import { OrganizationRoleCrud } from '../models/crud/OrganizationRoleCrud';
import { OrganizationRuleDto } from '../models/dto/OrganizationRuleDto';

const PREF_ORGANIZATION_ID = 'organizationId';
@Injectable({ providedIn: 'root' })
export class OrganizationService {
    private organizationUrl = `${environment.api}/api/organization`;
    private _organizationSelectedId = 0;

    public setOrganizationSelectedId(id: number) {
        this._organizationSelectedId = id;
        localStorage.setItem(PREF_ORGANIZATION_ID, id.toString());
    }

    public getOrganizationSelectedId() {
        return this._organizationSelectedId;
    }

    public async init(): Promise<void> {
        const res = localStorage.getItem(PREF_ORGANIZATION_ID);
        this.setOrganizationSelectedId(res == null || res === '' ? 0 : parseInt(res));
    }

    constructor(private http: HttpClient) { }

    public async getOrganizations(): Promise<OrganizationDto[]> {
        return await firstValueFrom(
            this.http.get<OrganizationDto[]>(this.organizationUrl + '/GetOrganizations', { headers: Utility.getAuthHeader() })
        );
    }

    public async getOrganizationRoles(idOrganization: number): Promise<OrganizationRoleDto[]> {
        return await firstValueFrom(
            this.http.get<OrganizationRoleDto[]>(this.organizationUrl + '/GetOrganizationRoles/' + idOrganization, { headers: Utility.getAuthHeader() })
        );
    }

    public async postOrganization(organizationCrud: OrganizationCrud): Promise<OrganizationDto | null> {
        return await firstValueFrom(
            this.http.post<OrganizationDto | null>(this.organizationUrl + '/PostOrganization', organizationCrud, { headers: Utility.getAuthHeader() })
        );
    }

    public async putOrganization(organizationCrud: OrganizationCrud): Promise<OrganizationDto | null> {
        return await firstValueFrom(
            this.http.put<OrganizationDto | null>(this.organizationUrl + '/PutOrganization', organizationCrud, { headers: Utility.getAuthHeader() })
        );
    }

    public async getOrganizationsTeams(userId: number): Promise<OrganizationTeamDto[]> {
        return await firstValueFrom(
            this.http.get<OrganizationTeamDto[]>(this.organizationUrl + '/GetOrganizationsTeams/' + userId, { headers: Utility.getAuthHeader() })
        );
    }

    public async postOrganizationRole(organizationRoleCrud: OrganizationRoleCrud): Promise<OrganizationRoleDto | null> {
        return await firstValueFrom(
            this.http.post<OrganizationRoleDto | null>(this.organizationUrl + '/PostOrganizationRole', organizationRoleCrud, { headers: Utility.getAuthHeader() })
        );
    }

    public async putOrganizationRole(organizationRoleCrud: OrganizationRoleCrud): Promise<OrganizationRoleDto | null> {
        return await firstValueFrom(
            this.http.put<OrganizationRoleDto | null>(this.organizationUrl + '/PutOrganizationRole', organizationRoleCrud, { headers: Utility.getAuthHeader() })
        );
    }

    public async deleteOrganizationRole(idOrganizationRole: number): Promise<boolean> {
        return await firstValueFrom(
            this.http.delete<boolean>(this.organizationUrl + '/DeleteOrganizationRole/' + idOrganizationRole, { headers: Utility.getAuthHeader() })
        );
    }

    public async getOrganizationRules(idOrganization: number): Promise<OrganizationRuleDto[]> {
        return await firstValueFrom(
            this.http.get<OrganizationRuleDto[]>(this.organizationUrl + '/GetOrganizationRules/' + idOrganization, { headers: Utility.getAuthHeader() })
        );
    }

    public async postOrganizationRule(organizationRuleCrud: OrganizationRuleCrud): Promise<OrganizationRuleDto | null> {
        return await firstValueFrom(
            this.http.post<OrganizationRuleDto | null>(this.organizationUrl + '/PostOrganizationRule', organizationRuleCrud, { headers: Utility.getAuthHeader() })
        );
    }

    public async postOrganizationRules(organizationRulesCrud: OrganizationRuleCrud[]): Promise<boolean> {
        return await firstValueFrom(
            this.http.post<boolean>(this.organizationUrl + '/PostOrganizationRules', organizationRulesCrud, { headers: Utility.getAuthHeader() })
        );
    }

    public async putOrganizationRule(organizationRuleCrud: OrganizationRuleCrud): Promise<OrganizationRuleDto | null> {
        return await firstValueFrom(
            this.http.put<OrganizationRuleDto | null>(this.organizationUrl + '/PutOrganizationRule', organizationRuleCrud, { headers: Utility.getAuthHeader() })
        );
    }

    public async deleteOrganizationRule(idOrganizationRule: number): Promise<boolean> {
        return await firstValueFrom(
            this.http.delete<boolean>(this.organizationUrl + '/DeleteOrganizationRule/' + idOrganizationRule, { headers: Utility.getAuthHeader() })
        );
    }

    public async getOrganizationUsers(idOrganization: number): Promise<UserDto[]> {
        return await firstValueFrom(
            this.http.get<UserDto[]>(this.organizationUrl + '/GetOrganizationUsers/' + idOrganization, { headers: Utility.getAuthHeader() })
        );
    }

    public async removeOrganizationUser(idOrganization: number, idUser: number): Promise<boolean> {
        return await firstValueFrom(
            this.http.delete<boolean>(this.organizationUrl + `/RemoveOrganizationUser/${idOrganization}/${idUser}`, { headers: Utility.getAuthHeader() })
        );
    }

    public async getUsersbyOrganization(idOrganization: number): Promise<UserDto[]> {
        return await firstValueFrom(
            this.http.get<UserDto[]>(this.organizationUrl + '/GetUsersbyOrganization/' + idOrganization, { headers: Utility.getAuthHeader() })
        );
    }

    public async getUsersbyService(idService: number): Promise<UserDto[]> {
        return await firstValueFrom(
            this.http.get<UserDto[]>(this.organizationUrl + '/GetUsersbyService/' + idService, { headers: Utility.getAuthHeader() })
        );
    }

    public async getOrganizationRulesByIDOrganization(idOrganization: number): Promise<OrganizationRuleDto[]> {
        return await firstValueFrom(
            this.http.get<OrganizationRuleDto[]>(this.organizationUrl + '/GetOrganizationRulesByIDOrganization/' + idOrganization, { headers: Utility.getAuthHeader() })
        );
    }
}
