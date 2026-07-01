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
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { OrganizationDto } from '../../models/dto/OrganizationDto';
import { OrganizationRuleDto } from '../../models/dto/OrganizationRuleDto';
import { OrganizationCrud } from '../../models/crud/OrganizationCrud';
import { OrganizationService } from '../../services/organization.service';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
    selector: 'app-organization-detail',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
        MatFormFieldModule, MatInputModule, MatSnackBarModule, MatListModule, MatDividerModule
    ],
    templateUrl: './organization-detail.component.html',
    styleUrls: ['./organization-detail.component.scss']
})
export class OrganizationDetailComponent implements OnInit {
    organization: OrganizationDto | null = null;
    rules: OrganizationRuleDto[] = [];
    isLoading = false;
    isSaving = false;
    editMode = false;
    editName = '';
    editDescription = '';

    constructor(
        private orgService: OrganizationService,
        private authService: AuthenticationService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadOrganization();
    }

    async loadOrganization(): Promise<void> {
        this.isLoading = true;
        try {
            const orgId = this.orgService.getOrganizationSelectedId();
            const [orgs, rules] = await Promise.all([
                this.orgService.getOrganizations(),
                orgId ? this.orgService.getOrganizationRulesByIDOrganization(orgId).catch(() => []) : Promise.resolve([])
            ]);
            this.organization = orgs.find(o => o.id === orgId) ?? null;
            this.rules = rules;
            if (this.organization) {
                this.organization.rules = rules;
            }
        } catch {
            this.snackBar.open('Errore nel caricamento organizzazione', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    startEdit(): void {
        if (!this.organization) return;
        this.editName = this.organization.name ?? '';
        this.editDescription = this.organization.description ?? '';
        this.editMode = true;
    }

    cancelEdit(): void { this.editMode = false; }

    async saveEdit(): Promise<void> {
        if (!this.organization) return;
        this.isSaving = true;
        try {
            const crud = new OrganizationCrud(
                this.editName,
                this.editDescription,
                this.organization.region ?? '',
                this.organization.ccnlcontract ?? '',
                this.organization.ccnlcontractDescription ?? '',
                this.organization.imagePath ?? '',
                this.organization.workSector ?? '',
                this.organization.isTemplate ?? 0,
                this.organization.prompt ?? '',
                this.organization.state ?? 1
            );
            await this.orgService.putOrganization(crud as any);
            this.organization.name = this.editName;
            this.organization.description = this.editDescription;
            this.editMode = false;
            this.snackBar.open('Organizzazione aggiornata', 'Ok', { duration: 2000 });
        } catch {
            this.snackBar.open('Errore nel salvataggio', 'Chiudi', { duration: 3000 });
        } finally {
            this.isSaving = false;
        }
    }

    openRules(): void {
        this.router.navigate(['/organization-rules']);
    }

    get activeRulesCount(): number {
        return this.rules.filter(rule => rule.state === 1).length;
    }
}
