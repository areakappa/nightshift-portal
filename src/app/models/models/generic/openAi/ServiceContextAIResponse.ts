import { ServiceRoleAIResponse } from "./ServiceRoleAIResponse";

export interface ServiceContextAIResponse {
    indice: number;
    servizio: string;
    contesto: string;
    ruoli: ServiceRoleAIResponse[];
    punti_non_chiari: string[];
    coerente_con_ccnl: boolean;
}
