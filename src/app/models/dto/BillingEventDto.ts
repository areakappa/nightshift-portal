export interface BillingEventDto {
    id: number;
    iduser?: number | null;
    idbillingEventType?: number | null;
    idbillingEventTypeName?: string | null;
    idproviderEvent?: number | null;
    idtransaction?: string | null;
    idoriginalTransaction?: string | null;
    idproduct?: string | null;
    identitlement?: string | null;
    provider?: string | null;
    environment?: string | null;
    effectiveDate?: string | null;
    payloadJson?: string | null;
    state?: number | null;
    created?: string | null;
}
