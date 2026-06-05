import { AddressDTO } from './addressDTO';
import { ServiceAvailabilityRequestedDto } from './ServiceAvailabilityRequestedDto';
import { ServiceRoleDto } from './ServiceRoleDto';
import { ServiceShiftDto } from './ServiceShiftDto';
import { TeamDto } from './TeamDto';

export interface ServiceDTO {
    id: number;
    idorganization: number;
    idcompany: number;
    idclient: number;
    idcontract: number | null;
    idserviceType: number;
    idserviceSubType: number | null;
    idserviceStation: number | null;
    idgroup: number | null;
    idshiftAutomation: number | null;
    name: string;
    description: string;
    clientName: string | null;
    startValidityDate: string;
    stopValidityDate: string | null;
    weekHours: number | null;
    monthHours: number | null;
    invoiceGroupTag: string | null;
    servicesAvailabilityRequested: ServiceAvailabilityRequestedDto[];
    serviceShifts: ServiceShiftDto[];
    serviceRoles: ServiceRoleDto[];
    idteam: number | null;
    team: TeamDto | null;
    address: AddressDTO | null;
    state: number;
    created: string;
}
