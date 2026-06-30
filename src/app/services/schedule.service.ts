import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Utility } from '../models/utility';

import { ShiftsSearch } from '../models/generic/Shift/ShiftsSearch';
import { ShiftItemDTO } from '../models/dto/ShiftItemDTO';
import { ShiftAutomationCrud } from '../models/dto/ShiftAutomationCrud';
import { GenerateShiftsRequest } from '../models/generic/Shift/GenerateShiftsRequest';
import { ScheduledNotificationDTO } from '../models/dto/ScheduledNotificationDTO';

export interface ReportOperatorUnavailabilityPayload {
    idShift: number | null;
    idUser: number;
    startDateTime: string;
    endDateTime: string;
    type: string;
    reason: string;
    source: string;
}

export interface OperatorUnavailabilityDecisionPayload {
    idNotification: number;
    approved: boolean;
    note?: string | null;
    regenerateShifts?: boolean;
}

export interface ShiftUpdatePayload {
    idShift: number;
    startDateTime: string;
    endDateTime: string;
    idUser: number | null;
    idEmployee: number | null;
}

@Injectable({
    providedIn: 'root'
})
export class ScheduleService {

    private scheduleUrl: string = `${environment.api}/api/schedule`;

    constructor(private http: HttpClient) { }

    getDateFromString(dateString: string)//da una stringa mi ricavo la data
    {
        const [day, month, year] = dateString.split('/');
        const date = new Date(+year, +month - 1, +day)
        return date
    }


    getStringFromDate(date: Date)//funzione per mandare le date sul back-end
    {
        try {
            // Verifica che date sia una Date valida
            if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
                console.error('Data non valida passata a getStringFromDate:', date);
                return '';
            }

            var day = date.getDate();       // yields date
            var month = date.getMonth() + 1;    // yields month (add one as '.getMonth()' is zero indexed)
            var year = date.getFullYear();  // yields year
            var time = day + "/" + month + "/" + year;
            return time;
        } catch (error) {
            console.error('Errore in getStringFromDate:', error, 'Data:', date);
            return '';
        }
    }

    //----------------------------------------------------------
    //apis
    //----------------------------------------------

    public async getShiftsByService(shiftsSearch: ShiftsSearch): Promise<ShiftItemDTO[]> {
        return await firstValueFrom(this.http.post<ShiftItemDTO[]>(`${this.scheduleUrl}/GetShiftsByService`, shiftsSearch, { headers: Utility.getAuthHeader() }));
    }

    public async getShiftsByUsers(shiftsSearch: ShiftsSearch): Promise<ShiftItemDTO[]> {
        return await firstValueFrom(this.http.post<ShiftItemDTO[]>(`${this.scheduleUrl}/GetShiftsByUsers`, shiftsSearch, { headers: Utility.getAuthHeader() }));
    }

    public async getShiftAutomationByService(idService: number): Promise<ShiftAutomationCrud | null> {
        return await firstValueFrom(this.http.get<ShiftAutomationCrud | null>(`${environment.api}/api/shiftAutomation/GetShiftAutomationbyIDService/${idService}`, { headers: Utility.getAuthHeader() }));
    }

    public async postShiftAutomation(automation: ShiftAutomationCrud): Promise<any> {
        return await firstValueFrom(this.http.post<any>(`${environment.api}/api/shiftAutomation/PostShiftAutomation`, automation, { headers: Utility.getAuthHeader() }));
    }

    public async putShiftAutomation(automation: ShiftAutomationCrud): Promise<any> {
        return await firstValueFrom(this.http.put<any>(`${environment.api}/api/shiftAutomation/PutShiftAutomation/` + automation.id, automation, { headers: Utility.getAuthHeader() }));
    }

    //AGGIUNGO UN ARRAY DI SCHEDULE TASK
    public async postScheduleTasksFromArray(mTasks: any[]): Promise<string[]> {
        return await firstValueFrom(this.http.post<string[]>(this.scheduleUrl + '/PostScheduleTaskFromArray', mTasks, { headers: Utility.getAuthHeader() }));
    }

    // Salva i turni generati
    public async postShifts(mShifts: any[]): Promise<any> {
        const clientsUrl = `${environment.api}/api/clients`;
        return await firstValueFrom(this.http.post<any>(clientsUrl + '/PostShift', mShifts, { headers: Utility.getAuthHeader() }));
    }

    public async generatePrompt(request: GenerateShiftsRequest): Promise<any> {
        return await firstValueFrom(
            this.http.post<any>(
                `${environment.api}/api/Shifts/GetGenerationPrompt`,
                request,
                { headers: Utility.getAuthHeader() }
            )
        );
    }
    // Genera i turni per un servizio
    public async generateShifts(request: GenerateShiftsRequest): Promise<any> {
        return await firstValueFrom(
            this.http.post<any>(
                `${environment.api}/api/Shifts/GenerateShifts`,
                request,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async confirmTemporaryShifts(idsShift: number[]): Promise<boolean> {
        return await firstValueFrom(this.http.post<boolean>(
            `${environment.api}/api/Shifts/ConfirmTemporaryShifts`, idsShift, { headers: Utility.getAuthHeader() }
        ));
    }

    public async confirmGeneratedShifts(shifts: any[]): Promise<boolean> {
        return await firstValueFrom(this.http.post<boolean>(
            `${environment.api}/api/Shifts/ConfirmGeneratedShifts`, shifts, { headers: Utility.getAuthHeader() }
        ));
    }

    public async cancelTemporaryShifts(idsShift: number[]): Promise<boolean> {
        return await firstValueFrom(this.http.post<boolean>(
            `${environment.api}/api/Shifts/CancelTemporaryShifts`, idsShift, { headers: Utility.getAuthHeader() }
        ));
    }
    public async getScheduledNotificationsByIDUser(idUser: number): Promise<ScheduledNotificationDTO[]> {
        return await firstValueFrom(
            this.http.get<ScheduledNotificationDTO[]>(
                `${this.scheduleUrl}/GetScheduledNotificationsByIDUser/${idUser}`,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async getScheduledNotificationsByIDCustomer(): Promise<ScheduledNotificationDTO[]> {
        return await firstValueFrom(this.http.get<ScheduledNotificationDTO[]>(
            `${this.scheduleUrl}/GetScheduledNotificationsByIDCustomer`, { headers: Utility.getAuthHeader() }
        ));
    }

    public async getScheduledNotificationsByIDSender(idSender: number): Promise<ScheduledNotificationDTO[]> {
        return await firstValueFrom(
            this.http.get<ScheduledNotificationDTO[]>(
                `${this.scheduleUrl}/GetScheduledNotificationsByIDSender/${idSender}`,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    // Segnalazione assenza/indisponibilita operatore dal dashboard mobile.
    public async reportOperatorUnavailability(payload: ReportOperatorUnavailabilityPayload): Promise<boolean> {
        return await firstValueFrom(
            this.http.post<boolean>(
                `${this.scheduleUrl}/ReportOperatorUnavailability`,
                payload,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async handleOperatorUnavailabilityDecision(payload: OperatorUnavailabilityDecisionPayload): Promise<boolean> {
        return await firstValueFrom(
            this.http.post<boolean>(
                `${this.scheduleUrl}/HandleOperatorUnavailabilityDecision`,
                payload,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async putShift(payload: ShiftUpdatePayload): Promise<boolean> {
        try {
            await this.executeShiftMutation(
                'put',
                `${environment.api}/api/shifts/PutShiftAndNotify/${payload.idShift}`,
                payload
            );
            return true;
        } catch {
            return false;
        }
    }

    public async putTemporaryShift(payload: ShiftUpdatePayload): Promise<boolean> {
        try {
            await this.executeShiftMutation('put', `${environment.api}/api/shifts/PutShift/${payload.idShift}`, payload);
            return true;
        } catch {
            return false;
        }
    }

    public async deleteShift(idShift: number): Promise<string[]> {        
        return await firstValueFrom(
            this.http.get<string[]>(
                `${this.scheduleUrl}/DeleteShift/${idShift}`,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    private async executeShiftMutation(
        method: 'put' | 'post' | 'delete',
        url: string,
        body: object | null
    ): Promise<void> {
        if (method === 'put') {
            await firstValueFrom(this.http.put(url, body, { headers: Utility.getAuthHeader() }));
            return;
        }

        if (method === 'post') {
            await firstValueFrom(this.http.post(url, body, { headers: Utility.getAuthHeader() }));
            return;
        }

        await firstValueFrom(
            this.http.delete(url, {
                headers: Utility.getAuthHeader(),
            })
        );
    }
}
