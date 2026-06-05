import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Utility } from '../models/utility';
import { InviteUser } from '../models/generic/team/InviteUser';

@Injectable({
    providedIn: 'root'
})
export class UsersService {
    private userUrl: string = `${environment.api}/api/users`;

    constructor(private http: HttpClient) { }

    public async updateFirebaseToken(idUser: number, token: string): Promise<boolean> {
        const encodedToken = encodeURIComponent(token);
        return await firstValueFrom(
            this.http.get<boolean>(`${this.userUrl}/UpdateFirebaseToken/${idUser}/${encodedToken}`, {
                headers: Utility.getAuthHeader()
            })
        );
    }

    public async sendInviteUser(inviteUser: InviteUser): Promise<boolean> {
        return await firstValueFrom(this.http.post<boolean>(`${this.userUrl}/SendInviteUser`, inviteUser, { headers: Utility.getAuthHeader() }));
    }

    public async deleteAccount(idUser: number): Promise<boolean> {
        return await firstValueFrom(
            this.http.get<boolean>(`${this.userUrl}/DeleteAccount/${idUser}`, {
                headers: Utility.getAuthHeader()
            })
        );
    }
}
