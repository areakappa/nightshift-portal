import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { Utility } from '../models/utility';
import { TeamContentCrud } from '../models/crud/TeamContentCrud';

/**
 * Service for team operations
 */
@Injectable({
    providedIn: 'root'
})
export class TeamsService {
    private teamsUrl: string = `${environment.api}/api/teams`;

    constructor(private http: HttpClient) { }

    public async postTeamContents(teamContentsCrud: TeamContentCrud[]): Promise<boolean> {
        return await firstValueFrom(this.http.post<boolean>(this.teamsUrl + '/PostTeamContents', teamContentsCrud, { headers: Utility.getAuthHeader() }));
    }

    public async deleteTeamContent(idTeamContent: number): Promise<boolean> {
        return await firstValueFrom(this.http.delete<boolean>(
            `${this.teamsUrl}/DeleteTeamContent/${idTeamContent}`,
            { headers: Utility.getAuthHeader() }
        ));
    }
}
