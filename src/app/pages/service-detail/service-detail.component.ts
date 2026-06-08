import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { TeamCoverage } from '../../models/generic/team/TeamCoverage';
import { UserDto } from '../../models/dto/userDto';
import { ServicesService } from '../../services/services.service';
import { OrganizationService } from '../../services/organization.service';

@Component({
    selector: 'app-service-detail',
    standalone: true,
    imports: [
        CommonModule, MatCardModule, MatButtonModule, MatIconModule,
        MatTabsModule, MatProgressSpinnerModule, MatChipsModule,
        MatDividerModule, MatSnackBarModule
    ],
    templateUrl: './service-detail.component.html',
    styleUrls: ['./service-detail.component.scss']
})
export class ServiceDetailComponent implements OnInit {
    service: ServiceDTO | null = null;
    teamCoverage: TeamCoverage | null = null;
    orgUsers: UserDto[] = [];
    isLoading = false;
    isCoverageLoading = false;

    constructor(
        private servicesService: ServicesService,
        private organizationService: OrganizationService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        const state = history.state;
        if (state?.service) {
            try { this.service = JSON.parse(state.service); } catch { }
        }
    }

    async ngOnInit(): Promise<void> {
        if (!this.service?.id) { this.router.navigate(['/services']); return; }
        // Load coverage in background — don't block page render
        void this.loadCoverage();
    }

    async refresh(): Promise<void> {
        if (!this.service?.id) { this.router.navigate(['/services']); return; }
        this.isLoading = true;
        try {
            this.service = await this.servicesService.getServicebyID(this.service.id);
        } catch {
            this.snackBar.open('Errore nel caricamento del servizio', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
        void this.loadCoverage();
    }

    private async loadCoverage(): Promise<void> {
        if (!this.service?.id) return;
        this.isCoverageLoading = true;
        try {
            const orgId = this.organizationService.getOrganizationSelectedId();
            const [cov, users] = await Promise.all([
                this.servicesService.getTeamServiceRoles(this.service.id),
                this.organizationService.getUsersbyOrganization(orgId)
            ]);
            this.teamCoverage = cov;
            this.orgUsers = users;
        } catch { /* coverage non critica */ }
        finally { this.isCoverageLoading = false; this.cdr.detectChanges(); }
    }

    goBack(): void { this.router.navigate(['/services']); }
    goToRoles(): void { this.router.navigateByUrl('/service-roles', { state: { service: JSON.stringify(this.service) } }); }
    goToShifts(): void { this.router.navigateByUrl('/service-shifts', { state: { service: JSON.stringify(this.service) } }); }
    goToSchedule(): void { this.router.navigateByUrl('/service-schedule', { state: { service: JSON.stringify(this.service) } }); }
    goToMaps(): void { this.router.navigateByUrl('/service-maps', { state: { service: JSON.stringify(this.service) } }); }
    goToTeam(): void { this.router.navigateByUrl('/wizard/team', { state: { service: JSON.stringify(this.service) } }); }

    getDate(d: string): string { return d ? new Date(d).toLocaleDateString('it-IT') : '—'; }
    getCoveragePct(): number {
        const t = this.teamCoverage?.totalRolesToCoverage ?? 0;
        return t > 0 ? Math.round(((this.teamCoverage?.totalRolesCoverage ?? 0) / t) * 100) : 100;
    }
}
