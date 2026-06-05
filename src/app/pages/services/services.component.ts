import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { ServicesService } from '../../services/services.service';
import { OrganizationService } from '../../services/organization.service';
import { DemoLimitService } from '../../services/demo-limit.service';
import { UpgradeService } from '../../services/upgrade.service';

@Component({
    selector: 'app-services',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatFormFieldModule,
        MatInputModule, MatChipsModule, MatSnackBarModule
    ],
    templateUrl: './services.component.html',
    styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit {
    services: ServiceDTO[] = [];
    filteredServices: ServiceDTO[] = [];
    searchText = '';
    isLoading = false;

    constructor(
        private servicesService: ServicesService,
        private organizationService: OrganizationService,
        private demoLimitService: DemoLimitService,
        private router: Router,
        private upgradeService: UpgradeService,
        private snackBar: MatSnackBar
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadServices();
    }

    async loadServices(): Promise<void> {
        try {
            this.isLoading = true;
            const orgId = this.organizationService.getOrganizationSelectedId();
            if (orgId) {
                this.services = await this.servicesService.getServicesbyIDOrganization(orgId);
                this.applyFilter();
            }
        } catch (e) {
            console.error(e);
            this.snackBar.open('Errore nel caricamento servizi', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
        }
    }

    applyFilter(): void {
        const q = this.searchText.trim().toLowerCase();
        this.filteredServices = q
            ? this.services.filter(s => s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
            : [...this.services];
    }

    async addService(): Promise<void> {
        if (await this.demoLimitService.isDemoServiceLimitReached({ services: this.services })) {
            await this.upgradeService.presentUpgradeFlow('Con il tuo piano puoi creare al massimo 1 servizio.', { contactOnly: true });
            return;
        }
        this.router.navigateByUrl('/wizard/service');
    }

    goToDetail(service: ServiceDTO): void {
        this.router.navigateByUrl('/service-detail', { state: { service: JSON.stringify(service) } });
    }

    isServiceActive(service: ServiceDTO): boolean {
        const now = new Date();
        const start = new Date(service.startValidityDate);
        const end = service.stopValidityDate ? new Date(service.stopValidityDate) : null;
        return service.state === 1 && start <= now && (!end || end >= now);
    }

    getDate(dateStr: string): string {
        return dateStr ? new Date(dateStr).toLocaleDateString('it-IT') : '—';
    }
}
