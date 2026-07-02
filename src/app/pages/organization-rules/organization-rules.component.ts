import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OrganizationRuleDto } from '../../models/dto/OrganizationRuleDto';
import { OrganizationRuleCrud } from '../../models/crud/OrganizationRuleCrud';
import { OrganizationService } from '../../services/organization.service';

@Component({
    selector: 'app-organization-rules',
    standalone: true,
    imports: [
        CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatFormFieldModule, MatInputModule, MatSnackBarModule
    ],
    templateUrl: './organization-rules.component.html',
    styleUrls: ['./organization-rules.component.scss']
})
export class OrganizationRulesComponent implements OnInit {
    rules: OrganizationRuleDto[] = [];
    isLoading = false;
    showForm = false;
    isSaving = false;
    editingRule: OrganizationRuleDto | null = null;
    draftName = '';
    draftDescription = '';

    constructor(
        private orgService: OrganizationService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadRules();
    }

    goBack(): void {
        this.router.navigate(['/organization-detail']);
    }

    async loadRules(): Promise<void> {
        this.isLoading = true;
        try {
            const orgId = this.orgService.getOrganizationSelectedId();
            if (!orgId) return;
            this.rules = await this.orgService.getOrganizationRulesByIDOrganization(orgId);
        } catch {
            this.snackBar.open('Errore nel caricamento regole', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    startAdd(): void {
        this.editingRule = null;
        this.draftName = '';
        this.draftDescription = '';
        this.showForm = true;
    }

    startEdit(rule: OrganizationRuleDto): void {
        this.editingRule = rule;
        this.draftName = rule.ruleOrException ?? '';
        this.draftDescription = rule.ruleOrExceptionDescription ?? '';
        this.showForm = true;
    }

    cancelForm(): void { this.showForm = false; this.editingRule = null; }

    async saveRule(): Promise<void> {
        if (!this.draftName.trim()) { this.snackBar.open('Nome obbligatorio', 'Chiudi', { duration: 2000 }); return; }
        this.isSaving = true;
        try {
            const orgId = this.orgService.getOrganizationSelectedId();
        const payload = new OrganizationRuleCrud(
                0, orgId,
                this.draftName.trim(),
                this.draftDescription.trim(),
                this.editingRule?.state ?? 1
            );
            if (this.editingRule?.id) {
                await this.orgService.putOrganizationRule({ ...payload, Idcustomer: this.editingRule.idcustomer, Id: this.editingRule.id } as any);
            } else {
                await this.orgService.postOrganizationRule(payload);
            }
            this.snackBar.open(this.editingRule ? 'Regola aggiornata' : 'Regola aggiunta', 'Ok', { duration: 2000 });
            this.cancelForm();
            await this.loadRules();
        } catch {
            this.snackBar.open('Errore nel salvataggio', 'Chiudi', { duration: 3000 });
        } finally {
            this.isSaving = false;
        }
    }

    async deleteRule(rule: OrganizationRuleDto): Promise<void> {
        if (!confirm(`Eliminare la regola "${rule.ruleOrException}"?`)) return;
        try {
            await this.orgService.deleteOrganizationRule(rule.id!);
            this.snackBar.open('Regola eliminata', 'Ok', { duration: 2000 });
            await this.loadRules();
        } catch {
            this.snackBar.open('Errore nell\'eliminazione', 'Chiudi', { duration: 3000 });
        }
    }
}
