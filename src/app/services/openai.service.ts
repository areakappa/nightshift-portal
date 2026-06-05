import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Utility } from '../models/utility';
import { firstValueFrom } from 'rxjs';
import { OpenAIRequest } from '../models/generic/openAi/OpenAIRequest';
import { OpenAIResponse } from '../models/generic/openAi/OpenAIResponse';

@Injectable({
    providedIn: 'root'
})
export class OpenAiService {

    private openAiUrl: string = `${environment.api}/api/openAI`;

    constructor(private http: HttpClient) { }

    public async getOpenAIResponse(openAiRequest: OpenAIRequest): Promise<OpenAIResponse> {
        return await firstValueFrom(
            this.http.post<OpenAIResponse>(
                this.openAiUrl + '/GetOpenAIResponse',
                openAiRequest,
                { headers: Utility.getAuthHeader() }
            )
        );
    }
}
