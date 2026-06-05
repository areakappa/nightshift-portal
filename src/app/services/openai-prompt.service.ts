import { OrganizationDto } from '../models/dto/OrganizationDto';

export class OpenAiPromptService {
    // Funzioni statiche per creare prompt per OpenAI

    /**
     * Genera il prompt per ottenere i ruoli suggeriti in base alla descrizione del servizio
     * @param serviceType La descrizione del tipo di servizio
     * @param ccnl Il contratto CCNL dell'organizzazione
     * @returns Il prompt formattato per OpenAI
     */
    public static getRolesPrompt(serviceType: string, ccnl: string): string {
        let prompt: string = "";
        prompt += "Devo predisporre un servizio e i suoi relativi turni. " + "\n\n";
        prompt += "La definizione del servizio è la seguente: " + serviceType + "\n\n";
        prompt += "Questo tipo di servizio deve essere coerente con " + ccnl + "\n\n";
        prompt += "Quali sono i principali ruoli disponibili?" + "\n\n";
        prompt += "Mi puoi formattare i dati che trovi in formato JSON con queste chiavi:" + "\n\n";
        prompt += "- un indice che mi fornisce il valore di comprensione della descrizione del servizio tra 0 e 100 (chiave \"indice\");" + "\n\n";
        prompt += "- un campo booleano \"coerente_con_ccnl\" che indica se il servizio descritto è compatibile e coerente con il CCNL " + ccnl + " (true se coerente, false se non coerente);" + "\n\n";
        prompt += "- inserisci l'elenco dei ruoli che hai trovato prima in una lista (chiave \"ruoli\"), ogni ruolo deve avere (chiave \"ruolo\" con il titolo del ruolo, campo \"mansione\" la descrizione del ruolo);" + "\n\n";
        prompt += "\r\n Evita la scritta 'json' e gli apici pre e post oggetto grazie.";
        return prompt;
    }

    /**
     * Genera un prompt per ottenere esempi coerenti per nome servizio e descrizione.
     * @param serviceFor Tipologia servizio (internal/external)
     * @param ccnl Contratto CCNL dell'organizzazione
     * @param serviceName Nome servizio inserito (opzionale)
     * @returns Prompt formattato per OpenAI
     */
    public static getServiceExamplesPrompt(
        serviceFor: string,
        ccnl: string,
        serviceName?: string,
        organization?: OrganizationDto | null
    ): string {
        let prompt = '';
        const orgName = organization?.name?.trim();
        const orgDescription = organization?.description?.trim();
        const orgSector = organization?.workSector?.trim();
        const orgRegion = organization?.region?.trim();
        const ccnlDescription = organization?.ccnlcontractDescription?.trim();
        const orgPrompt = organization?.prompt?.trim();

        prompt += "Genera suggerimenti per compilare un nuovo servizio.\n\n";
        prompt += "Contesto:\n";
        prompt += `- Tipologia servizio: ${serviceFor === 'external' ? 'Per un cliente' : 'Per la tua azienda'}\n`;
        prompt += `- CCNL: ${ccnl}\n`;
        if (ccnlDescription) {
            prompt += `- Dettaglio CCNL: ${ccnlDescription}\n`;
        }
        if (orgName) {
            prompt += `- Nome organizzazione: ${orgName}\n`;
        }
        if (orgSector) {
            prompt += `- Settore organizzazione: ${orgSector}\n`;
        }
        if (orgRegion) {
            prompt += `- Regione operativa: ${orgRegion}\n`;
        }
        if (orgDescription) {
            prompt += `- Descrizione organizzazione: ${orgDescription}\n`;
        }
        if (orgPrompt) {
            prompt += `- Istruzioni organizzative: ${orgPrompt}\n`;
        }
        if (serviceName && serviceName.trim()) {
            prompt += `- Nome servizio inserito: ${serviceName.trim()}\n`;
        }
        prompt += "\n";
        prompt += "Obiettivo:\n";
        prompt += "- Fornisci esempi concreti, operativi e coerenti con il contesto sopra\n";
        prompt += "- Se il contesto e' limitato, evita frasi vaghe e proponi casi d'uso plausibili nel settore indicato\n";
        prompt += "\n";
        prompt += "Rispondi SOLO con un oggetto JSON con queste chiavi:\n";
        prompt += "- name_examples: array di 3 stringhe brevi e realistiche per 'Nome Servizio'\n";
        prompt += "- description_examples: array di 3 descrizioni piu estese (tra 140 e 220 caratteri) per 'Tipo di servizio'\n";
        prompt += "  ogni descrizione deve essere operativa e coerente con il Nome servizio inserito; se il nome e' presente usalo come riferimento principale\n";
        prompt += "\n";
        prompt += "Vincoli:\n";
        prompt += "- Italiano naturale e professionale\n";
        prompt += "- Evita testo generico, astratto o troppo tecnico\n";
        prompt += "- Evita parole riempitive come 'servizio completo', 'attivita varie', 'supporto generale'\n";
        prompt += "- Ogni descrizione deve indicare almeno una attivita concreta (es. presidio accessi, ronda, controllo badge, reception)\n";
        prompt += "- Ogni descrizione deve essere una frase completa, non un titolo\n";
        prompt += "- Nessun markdown, nessun testo extra\n";
        return prompt;
    }
}
