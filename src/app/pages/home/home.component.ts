import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { OrganizationDto } from '../../models/dto/OrganizationDto';
import { OrganizationTeamDto } from '../../models/dto/OrganizationTeamDto';
import { TeamCoverage } from '../../models/generic/team/TeamCoverage';
import { AuthenticateUser } from '../../models/authenticateUser';
import { ShiftsSearch } from '../../models/generic/Shift/ShiftsSearch';
import { AuthenticationService } from '../../services/authentication.service';
import { OrganizationService } from '../../services/organization.service';
import { ServicesService } from '../../services/services.service';
import { ScheduleService } from '../../services/schedule.service';
import { DemoLimitService } from '../../services/demo-limit.service';
import { UpgradeService } from '../../services/upgrade.service';

type ServiceStatus = 'Pronto' | 'Setup';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [
        CommonModule, MatCardModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatBadgeModule, MatChipsModule,
        MatDividerModule, MatTooltipModule
    ],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
    orgName = 'Nessuna organizzazione';
    services: ServiceDTO[] = [];
    coveragePct = 0;
    teamAssigned = 0;
    teamNeeded = 0;
    weekLabel = '';
    recentActivity: string[] = ['Nessuna attività recente disponibile'];
    currentUser: AuthenticateUser | undefined;
    organizationSelected: OrganizationDto | null = null;
    organizationsTeams: OrganizationTeamDto[] = [];
    isLoading = false;
    isServicesLoading = false;
    loadError = '';

    private readonly serviceCoverage = new Map<number, TeamCoverage | null>();

    constructor(
        private authentication: AuthenticationService,
        private cdr: ChangeDetectorRef,
        private servicesService: ServicesService,
        private scheduleService: ScheduleService,
        private organizationService: OrganizationService,
        private demoLimitService: DemoLimitService,
        private router: Router,
        private upgradeService: UpgradeService
    ) {
        const now = new Date();
        const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1);
        const end = new Date(start); end.setDate(start.getDate() + 6);
        this.weekLabel = `${start.toLocaleDateString('it-IT')} – ${end.toLocaleDateString('it-IT')}`;
    }

    async ngOnInit(): Promise<void> {
        await this.refresh();
    }

    get hasOrganization(): boolean {
        return !!this.organizationSelected && this.organizationService.getOrganizationSelectedId() > 0;
    }

    async refresh(): Promise<void> {
        this.isLoading = true;
        this.loadError = '';
        try {
            this.currentUser = this.authentication.getUser();
            if (!this.currentUser) { this.resetState(); return; }
            await this.loadOrganizationsTeams(this.currentUser.id);
        } catch (e) {
            console.error(e);
            this.loadError = 'Impossibile caricare i dati della home.';
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
        // Carica servizi e copertura in background senza bloccare il render
        if (this.organizationSelected) void this.loadServices();
    }

    private async loadOrganizationsTeams(userId: number): Promise<void> {
        try {
            this.organizationsTeams = await this.organizationService.getOrganizationsTeams(userId);
            const orgId = this.organizationService.getOrganizationSelectedId() || this.organizationsTeams[0]?.organization?.id || 0;
            if (orgId) this.organizationService.setOrganizationSelectedId(orgId);
            this.organizationSelected = this.organizationsTeams.find(t => t.organization?.id === orgId)?.organization ?? null;
            this.orgName = this.organizationSelected?.name ?? 'Nessuna organizzazione';
        } catch (e) {
            if (this.authentication.isDemoLicenseExpiredError(e)) { await this.authentication.handleDemoLicenseExpired(); return; }
            this.organizationsTeams = []; this.organizationSelected = null; this.orgName = 'Nessuna organizzazione';
        }
    }

    private async loadServices(): Promise<void> {
        const orgId = this.organizationService.getOrganizationSelectedId();
        if (!orgId) return;
        this.isServicesLoading = true;
        this.cdr.detectChanges();
        try {
            this.services = await this.servicesService.getServicesbyIDOrganization(orgId);
            this.serviceCoverage.clear();
            let totalAssigned = 0; let totalNeeded = 0;
            for (const service of this.services) {
                try {
                    const cov = await this.servicesService.getTeamServiceRoles(service.id);
                    this.serviceCoverage.set(service.id, cov);
                    totalAssigned += cov?.totalRolesCoverage ?? 0;
                    totalNeeded += cov?.totalRolesToCoverage ?? 0;
                } catch { this.serviceCoverage.set(service.id, null); }
            }
            this.teamAssigned = totalAssigned; this.teamNeeded = totalNeeded;
            this.coveragePct = totalNeeded > 0 ? Math.round((totalAssigned / totalNeeded) * 100) : 100;
            await this.loadRecentShifts(orgId);
        } finally {
            this.isServicesLoading = false;
            this.cdr.detectChanges();
        }
    }

    private async loadRecentShifts(orgId: number): Promise<void> {
        try {
            const today = new Date();
            const search = new ShiftsSearch(
                null,
                this.scheduleService.getStringFromDate(today),
                this.scheduleService.getStringFromDate(today)
            );
            const shifts = await this.scheduleService.getShiftsByService(search);
            this.recentActivity = shifts.length > 0
                ? shifts.slice(0, 5).map(s => `${s.nameEmployee ?? '—'} · ${s.nameServiceType ?? ''} · ${s.role ?? s.roleName ?? ''}`)
                : ['Nessun turno per oggi'];
        } catch { this.recentActivity = ['Errore nel caricamento attività']; }
    }

    private resetState(): void {
        this.orgName = 'Nessuna organizzazione';
        this.organizationSelected = null;
        this.organizationsTeams = [];
        this.services = []; this.coveragePct = 0; this.teamAssigned = 0; this.teamNeeded = 0;
        this.recentActivity = ['Nessuna attività disponibile'];
    }

    getServiceStatus(service: ServiceDTO): ServiceStatus {
        const cov = this.serviceCoverage.get(service.id);
        const hasShifts = (service.serviceShifts?.length ?? 0) > 0;
        const missingRoles = cov?.totalRolesToCoverage ?? 0;
        return hasShifts && missingRoles === 0 ? 'Pronto' : 'Setup';
    }

    getCoverageForService(service: ServiceDTO): TeamCoverage | null {
        return this.serviceCoverage.get(service.id) ?? null;
    }

    isServiceActive(service: ServiceDTO): boolean {
        const now = new Date();
        const start = new Date(service.startValidityDate);
        const end = service.stopValidityDate ? new Date(service.stopValidityDate) : null;
        return service.state === 1 && start <= now && (!end || end >= now);
    }

    goToService(service: ServiceDTO): void {
        this.router.navigateByUrl('/service-detail', { state: { service: JSON.stringify(service) } });
    }

    async addService(): Promise<void> {
        if (!this.hasOrganization) {
            this.addOrganization();
            return;
        }
        if (await this.demoLimitService.isDemoServiceLimitReached({ services: this.services })) {
            await this.upgradeService.presentUpgradeFlow('Con il tuo piano puoi creare al massimo 1 servizio.', { contactOnly: true });
            return;
        }
        this.router.navigateByUrl('/wizard/service');
    }

    addOrganization(): void { this.router.navigateByUrl('/wizard/organization'); }
    goToServices(): void { this.router.navigate(['/services']); }
    goToDashboard(): void { this.router.navigate(['/dashboard']); }
    goToCalendar(): void { this.router.navigate(['/calendar']); }
}
