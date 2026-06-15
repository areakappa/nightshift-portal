import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OrganizationService } from '../../../services/organization.service';
import { OpenAiService } from '../../../services/openai.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { CCNLContract } from '../../../models/CCNLContract';
import { OrganizationCrud } from '../../../models/crud/OrganizationCrud';
import { OrganizationRuleCrud } from '../../../models/crud/OrganizationRuleCrud';
import { ContractRulesFromGpt } from '../../../models/generic/ContractRulesFromGpt';
import { OpenAIRequest } from '../../../models/generic/openAi/OpenAIRequest';

interface RuleOption {
    vincolo: string;
    descrizione: string;
    selected: boolean;
}

@Component({
    selector: 'app-organization-wizard',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule,
        MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
        MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
        MatStepperModule, MatSnackBarModule
    ],
    templateUrl: './organization-wizard.component.html',
    styleUrls: ['./organization-wizard.component.scss']
})
export class OrganizationWizardComponent {
    isSaving = false;
    isLoadingContracts = false;
    isLoadingRules = false;
    createdOrganizationId = 0;

    infoForm: FormGroup;
    sectorForm: FormGroup;

    regions = [
        'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
        'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
        'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
        'Trentino-Alto Adige', 'Umbria', 'Valle d\'Aosta', 'Veneto'
    ];

    contracts: CCNLContract[] = [];
    selectedContract: CCNLContract | null = null;
    rules: RuleOption[] = [];

    constructor(
        private fb: FormBuilder,
        private orgService: OrganizationService,
        private openAiService: OpenAiService,
        private authService: AuthenticationService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        this.infoForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            description: ['', Validators.required]
        });
        this.sectorForm = this.fb.group({
            workSector: ['', Validators.required],
            region: ['', Validators.required]
        });
    }

    async goNext(stepper: MatStepper, form?: FormGroup): Promise<void> {
        if (form?.invalid) {
            form.markAllAsTouched();
            return;
        }
        stepper.next();
    }

    async goToContracts(stepper: MatStepper): Promise<void> {
        if (this.sectorForm.invalid) {
            this.sectorForm.markAllAsTouched();
            return;
        }

        stepper.next();
        await this.loadContracts();
    }

    async goToRules(stepper: MatStepper): Promise<void> {
        if (!this.selectedContract) {
            this.snackBar.open('Seleziona un contratto CCNL', 'Ok', { duration: 2500 });
            return;
        }

        stepper.next();
        await this.loadRules();
    }

    selectContract(contract: CCNLContract): void {
        this.selectedContract = contract;
    }

    async loadContracts(): Promise<void> {
        this.isLoadingContracts = true;
        this.contracts = [];
        this.selectedContract = null;
        try {
            let prompt = "Per un'azienda che opera nel settore '" +
                this.sectorForm.value.workSector +
                "' quali sono i contratti CCNL, e solo quelli, che devono essere applicati ai propri dipendenti ?\r\n- Rispondi **solo** in formato JSON valido.\r\n- L'output deve essere un **array di oggetti**, ognuno rappresentante un contratto con la corretta dicitura '\r\n Evita la scritta 'json' e gli apici pre e post oggetto grazie.";

            prompt = "Sei un assistente che risponde esclusivamente in JSON valido.Non aggiungere markdown.";
            let userInput = "Per un'azienda che opera nel settore " + this.sectorForm.value.workSector  + "estrai tutti i contratti CCNL applicabili. Rispondi solo in JSON valido. L'output deve essere un array di oggetti fatti in questo modo: { contratto: string; descrizione: string;}.";

            const obj = await this.openAiService.getOpenAIResponse(
                new OpenAIRequest(userInput, prompt)
            );
            this.contracts = this.parseJsonArray<CCNLContract>(obj.response)
                .filter(contract => contract.contratto);
            this.selectedContract = this.contracts[0] ?? null;
        } catch {
            this.snackBar.open('Errore nel caricamento dei contratti CCNL. Riprova.', 'Chiudi', { duration: 3500 });
        } finally {
            this.isLoadingContracts = false;
            this.cdr.detectChanges();
        }
    }

    async loadRules(): Promise<void> {
        this.isLoadingRules = true;
        this.rules = [];
        try {
            const prompt =
                'Dovendo preparare i turni di lavoro aziendali, per una azienda che si trova in ' +
                this.sectorForm.value.region +
                '  riferendoci al contratto ' +
                this.selectedContract?.contratto +
                ', estrai dal contratto tutti i vincoli che devono essere rispettati. - Rispondi solo in formato JSON valido.- L output deve essere un array di oggetti, ognuno rappresentante un vincolo \r\n Evita la scritta json e gli apici pre e post oggetto grazie.';
            const obj = await this.openAiService.getOpenAIResponse(
                new OpenAIRequest( prompt, "")
            );
            this.rules = this.parseJsonArray<ContractRulesFromGpt>(obj.response)
                .filter(rule => rule.vincolo)
                .map(rule => ({ ...rule, selected: rule.selected !== false }));
        } catch {
            this.snackBar.open('Errore nel caricamento delle regole contrattuali. Riprova.', 'Chiudi', { duration: 3500 });
        } finally {
            this.isLoadingRules = false;
            this.cdr.detectChanges();
        }
    }

    async createOrganization(): Promise<void> {
        if (this.infoForm.invalid || this.sectorForm.invalid || !this.selectedContract) {
            this.infoForm.markAllAsTouched();
            this.sectorForm.markAllAsTouched();
            return;
        }
        this.isSaving = true;
        try {
            const prompt = this.rules
                .filter(rule => rule.selected)
                .map(rule => `${rule.vincolo}: ${rule.descrizione}`)
                .join('\n');
            const organizationCrud = new OrganizationCrud(
                this.infoForm.value.name,
                this.infoForm.value.description,
                this.sectorForm.value.region,
                this.selectedContract.contratto,
                this.selectedContract.descrizione,
                '',
                this.sectorForm.value.workSector,
                0,
                prompt,
                1
            );
            const organization = await this.orgService.postOrganization(organizationCrud);
            this.createdOrganizationId = organization?.id ?? 0;
            if (this.createdOrganizationId) {
                this.orgService.setOrganizationSelectedId(this.createdOrganizationId);
                await this.saveSelectedRules();
            }
            this.snackBar.open('Organizzazione creata!', 'Ok', { duration: 2000 });
            this.finish();
        } catch {
            this.snackBar.open('Errore nella creazione', 'Chiudi', { duration: 3000 });
        } finally {
            this.isSaving = false;
        }
    }

    private async saveSelectedRules(): Promise<void> {
        const idCustomer = this.authService.getUser()?.idCustomer ?? 0;
        const rulesCrud = this.rules
            .filter(item => item.selected)
            .map(rule => new OrganizationRuleCrud(idCustomer, this.createdOrganizationId, rule.vincolo, rule.descrizione, 1));
        if (rulesCrud.length) await this.orgService.postOrganizationRules(rulesCrud);
    }

    private parseJsonArray<T>(response: string): T[] {
        const cleanedResponse = response
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
        const arrayStart = cleanedResponse.indexOf('[');
        const arrayEnd = cleanedResponse.lastIndexOf(']');
        const json = arrayStart >= 0 && arrayEnd >= arrayStart
            ? cleanedResponse.slice(arrayStart, arrayEnd + 1)
            : cleanedResponse;
        return JSON.parse(json) as T[];
    }

    finish(): void { this.router.navigate(['/home']); }
    cancel(): void { this.router.navigate(['/home']); }
}
