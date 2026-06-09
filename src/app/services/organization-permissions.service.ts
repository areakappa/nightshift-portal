import { Injectable } from '@angular/core';
import { AccountContextService } from './account-context.service';

@Injectable({ providedIn: 'root' })
export class OrganizationPermissionsService {
    constructor(
        private accountContextService: AccountContextService
    ) { }

    async canViewAllShifts(): Promise<boolean> {
        return (await this.accountContextService.refresh()).isManager;
    }
}
