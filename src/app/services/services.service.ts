import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceDTO } from '../models/dto/serviceDTO';
import { ServiceCrud } from '../models/crud/ServiceCrud';
import { ServiceRoleCrud } from '../models/crud/ServiceRoleCrud';
import { Utility } from '../models/utility';
import { ServiceAvailabilityRequestedCrud } from '../models/crud/ServiceAvailabilityRequestedCrud';
import { TeamCoverage } from '../models/generic/team/TeamCoverage';
import { mShiftType } from '../models/dto/mShiftType';
import { ServiceShiftCrud } from '../models/crud/ServiceShiftCrud';
import { mStation } from '../models/dto/mStation';
import { TeamSizeEstimateRequest, TeamSizeEstimateResponse } from '../models/generic/team/TeamSizeEstimate';

@Injectable({
    providedIn: 'root'
})
export class ServicesService {
    private serviceUrl: string = `${environment.api}/api/services`;
    private shiftTypeUrl: string = `${environment.api}/api/shiftType`;
    private stationUrls: string[] = [
        `${environment.api}/api/station`,
        `${environment.api}/api/stations`
    ];
    private readonly servicesChangedSubject = new Subject<number>();

    readonly servicesChanged$ = this.servicesChangedSubject.asObservable();

    constructor(private http: HttpClient) { }

    public notifyServicesChanged(idOrganization: number): void {
        this.servicesChangedSubject.next(idOrganization);
    }

    public async getServicesbyIDOrganization(
        idOrganization: number
    ): Promise<ServiceDTO[]> {
        return await firstValueFrom(
            this.http.get<ServiceDTO[]>(
                this.serviceUrl + '/GetServicesbyIDOrganization/' + idOrganization,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async getServicebyID(
        idService: number
    ): Promise<ServiceDTO | null> {
        return await firstValueFrom(
            this.http.get<ServiceDTO | null>(
                this.serviceUrl + '/GetService/' + idService,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async addServicesAvailabilityRequested(
        servicesAvailabilityRequestedCrud: ServiceAvailabilityRequestedCrud[]
    ): Promise<boolean> {
        return await firstValueFrom(
            this.http.post<boolean>(
                this.serviceUrl + '/AddServicesAvailabilityRequested',
                servicesAvailabilityRequestedCrud,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async getTeamServiceRoles(idService: number): Promise<TeamCoverage> {
        return await firstValueFrom(
            this.http.get<TeamCoverage>(
                this.serviceUrl + '/GetTeamServiceRoles/' + idService,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async estimateTeamSize(request: TeamSizeEstimateRequest): Promise<TeamSizeEstimateResponse | null> {
        return await firstValueFrom(
            this.http.post<TeamSizeEstimateResponse | null>(
                this.serviceUrl + '/EstimateTeamSize',
                request,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async postShiftType(shiftType: mShiftType): Promise<mShiftType> {
        return await firstValueFrom(
            this.http.post<mShiftType>(
                this.shiftTypeUrl + '/PostShiftType',
                shiftType,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async putShiftType(shiftType: mShiftType): Promise<mShiftType> {
        return await firstValueFrom(
            this.http.put<mShiftType>(
                this.shiftTypeUrl + '/PutShiftType',
                shiftType,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async postServiceShifts(
        serviceShifts: ServiceShiftCrud[]
    ): Promise<boolean> {
        return await firstValueFrom(
            this.http.post<boolean>(
                this.serviceUrl + '/PostServiceShifts',
                serviceShifts,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async postService(service: ServiceCrud): Promise<ServiceDTO | number> {
        return await firstValueFrom(
            this.http.post<ServiceDTO | number>(
                this.serviceUrl + '/PostService',
                service,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async postServiceRole(serviceRole: ServiceRoleCrud): Promise<boolean> {
        return await firstValueFrom(
            this.http.post<boolean>(
                this.serviceUrl + '/PostServiceRole',
                serviceRole,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async deleteServiceRole(idServiceRole: number): Promise<boolean> {
        return await firstValueFrom(
            this.http.delete<boolean>(
                this.serviceUrl + '/DeleteServiceRole/' + idServiceRole,
                { headers: Utility.getAuthHeader() }
            )
        );
    }

    public async putStation(idStation: number, updatedStation: mStation): Promise<boolean> {
        const routes = this.stationUrls.map((baseUrl) => `${baseUrl}/PutStation/${idStation}`);

        for (const route of routes) {
            try {
                await firstValueFrom(
                    this.http.put<boolean>(route, updatedStation, { headers: Utility.getAuthHeader() })
                );
                return true;
            } catch {
                // Try next candidate endpoint.
            }
        }

        return false;
    }
}
