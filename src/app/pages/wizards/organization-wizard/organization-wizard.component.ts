import { Component } from '@angular/core';
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
import { OrganizationCrud } from '../../../models/crud/OrganizationCrud';
import { OrganizationRuleCrud } from '../../../models/crud/OrganizationRuleCrud';

interface ContractOption {
    title: string;
    description: string;
}

interface RuleOption {
    title: string;
    description: string;
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
    createdOrganizationId = 0;

    infoForm: FormGroup;
    sectorForm: FormGroup;

    regions = [
        'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
        'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
        'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
        'Trentino-Alto Adige', 'Umbria', 'Valle d\'Aosta', 'Veneto'
    ];

    contracts: ContractOption[] = [
        {
            title: 'CCNL del Commercio',
            description: 'Contratto Collettivo Nazionale del Lavoro per il settore commercio, applicabile anche alle aziende informatiche che operano nella vendita di prodotti e servizi tecnologici.'
        },
        {
            title: 'CCNL Metalmeccanico',
            description: 'Contratto Collettivo Nazionale del Lavoro per il settore metalmeccanico, applicabile a imprese che operano in ambiti tecnici e ingegneristici.'
        },
        {
            title: 'CCNL dell\'Informatica e delle Telecomunicazioni',
            description: 'Contratto Collettivo Nazionale specifico per informatica e telecomunicazioni, regola diritti e doveri dei lavoratori in questo campo.'
        }
    ];

    selectedContract = this.contracts[0];

    rules: RuleOption[] = [
        { title: 'Orario di lavoro settimanale', description: 'Massimo 40 ore settimanali.', selected: true },
        { title: 'Giorni di riposo', description: 'Almeno 1 giorno di riposo ogni 7 giorni.', selected: true },
        { title: 'Flessibilità', description: 'La distribuzione dell\'orario di lavoro può essere flessibile, rispettando le 40 ore settimanali.', selected: true },
        { title: 'Lavoro straordinario', description: 'Deve essere preventivamente autorizzato e compensato secondo le disposizioni del CCNL.', selected: true },
        { title: 'Pausa', description: 'Dopo 6 ore di lavoro continuativo è obbligatoria una pausa di almeno 30 minuti.', selected: true }
    ];

    constructor(
        private fb: FormBuilder,
        private orgService: OrganizationService,
        private router: Router,
        private snackBar: MatSnackBar
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

    goNext(stepper: MatStepper, form?: FormGroup): void {
        if (form?.invalid) {
            form.markAllAsTouched();
            return;
        }
        stepper.next();
    }

    selectContract(contract: ContractOption): void {
        this.selectedContract = contract;
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
                .map(rule => `${rule.title}: ${rule.description}`)
                .join('\n');
            const organizationCrud = new OrganizationCrud(
                this.infoForm.value.name,
                this.infoForm.value.description,
                this.sectorForm.value.region,
                this.selectedContract.title,
                this.selectedContract.description,
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
        for (const rule of this.rules.filter(item => item.selected)) {
            try {
                await this.orgService.postOrganizationRule(
                    new OrganizationRuleCrud(0, this.createdOrganizationId, rule.title, rule.description, 1)
                );
            } catch { }
        }
    }

    finish(): void { this.router.navigate(['/home']); }
    cancel(): void { this.router.navigate(['/home']); }
}
