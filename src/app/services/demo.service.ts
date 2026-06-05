import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Utility } from '../models/utility';
import { RegisterModel } from '../models/generic/RegisterModel';
import { DemoInformations } from '../models/generic/DemoInformations';
import { PreUser } from '../models/generic/PreUser';
import { UserDto } from '../models/dto/userDto';

@Injectable({
    providedIn: 'root'
})
export class DemoService {
    private demoUrl: string = `${environment.api}/api/demo`;

    constructor(private http: HttpClient) { }

    public async register(registerModel: RegisterModel): Promise<any> {
        return await firstValueFrom(
            this.http.post<any>(`${this.demoUrl}/Register`, registerModel)
        );
    }

    public async activateAccount(token: string): Promise<boolean> {
        return await firstValueFrom(
            this.http.post<boolean>(`${this.demoUrl}/ActivateAccount`, { token })
        );
    }

    public async resendActivationEmail(email: string): Promise<boolean> {
        return await firstValueFrom(
            this.http.post<boolean>(`${this.demoUrl}/ResendActivationEmail`, { email })
        );
    }

    public async addDemoInformations(demoInformations: DemoInformations): Promise<boolean> {
        return await firstValueFrom(
            this.http.post<boolean>(`${this.demoUrl}/AddDemoInformations`, demoInformations, { headers: Utility.getAuthHeader() })
        );
    }

    public async addPreUser(preUser: PreUser): Promise<UserDto | null> {
        return await firstValueFrom(
            this.http.post<UserDto | null>(`${this.demoUrl}/AddPreUser`, preUser, { headers: Utility.getAuthHeader() })
        );
    }
}
