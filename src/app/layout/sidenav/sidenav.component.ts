import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { AuthenticationService } from '../../services/authentication.service';
import { OrganizationService } from '../../services/organization.service';
import { ThemeService } from '../../services/theme.service';
import { OrganizationDto } from '../../models/dto/OrganizationDto';
import { Utility } from '../../models/utility';
import { AccountContext, AccountContextService } from '../../services/account-context.service';
import { ServicesService } from '../../services/services.service';

interface NavItem {
    label: string;
    icon: string;
    route: string;
    roles?: Array<'manager' | 'operator'>;
    requiresOrganization?: boolean;
    requiresService?: boolean;
}

@Component({
    selector: 'app-sidenav',
    standalone: true,
    imports: [
        CommonModule, RouterModule, FormsModule,
        MatListModule, MatIconModule, MatButtonModule,
        MatSelectModule, MatSlideToggleModule, MatDividerModule, MatTooltipModule
    ],
    templateUrl: './sidenav.component.html',
    styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent implements OnInit {
    @Output() closeSidenav = new EventEmitter<void>();

    navItems: NavItem[] = [
        { label: 'Home', icon: 'home', route: '/home', roles: ['manager'] },
        { label: 'Servizi', icon: 'business_center', route: '/services', requiresService: true, roles: ['manager'] },
        { label: 'Calendario', icon: 'calendar_month', route: '/calendar', requiresService: true },
        { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', requiresService: true },
        { label: 'Team', icon: 'group', route: '/team', requiresService: true, roles: ['manager'] },
        { label: 'Notifiche', icon: 'notifications', route: '/notifications', requiresService: true },
        { label: 'Indisponibilità', icon: 'event_busy', route: '/unavailability', requiresService: true },
    ];

    organizations: OrganizationDto[] = [];
    selectedOrgId: number = 0;
    hasServices = false;
    isDark = false;
    currentRoute = '';
    user: any = null;
    accountContext$!: Observable<AccountContext>;

    constructor(
        private router: Router,
        public authService: AuthenticationService,
        private orgService: OrganizationService,
        private servicesService: ServicesService,
        private themeService: ThemeService,
        private accountContextService: AccountContextService
    ) {
        this.user = this.authService.getUser();
        this.accountContext$ = this.accountContextService.context$;
    }

    async ngOnInit(): Promise<void> {
        this.isDark = this.themeService.get() === 'dark';
        this.selectedOrgId = this.orgService.getOrganizationSelectedId();

        this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
            this.currentRoute = e.urlAfterRedirects;
            void this.refreshWorkspaceState();
        });
        this.servicesService.servicesChanged$.subscribe(orgId => {
            if (orgId === this.selectedOrgId) void this.loadServicesState();
        });
        this.currentRoute = this.router.url;

        await this.refreshWorkspaceState();
    }

    private async refreshWorkspaceState(): Promise<void> {
        await this.loadOrganizations();
        await Promise.all([
            this.loadServicesState(),
            this.accountContextService.refresh()
        ]);
    }

    private async loadOrganizations(): Promise<void> {
        try {
            const userId = this.authService.getUser()?.id ?? 0;
            const organizationsTeams = userId ? await this.orgService.getOrganizationsTeams(userId) : [];
            this.organizations = organizationsTeams
                .map(item => item.organization)
                .filter((organization): organization is OrganizationDto => !!organization);
            if (this.organizations.length > 0 && !this.selectedOrgId) {
                this.onOrgChange(this.organizations[0].id);
            } else if (this.organizations.length === 0) {
                this.selectedOrgId = 0;
                this.orgService.setOrganizationSelectedId(0);
            }
        } catch (e) {
            console.error('Errore caricamento organizzazioni:', e);
        }
    }

    onOrgChange(id: number): void {
        this.selectedOrgId = id;
        this.orgService.setOrganizationSelectedId(id);
        void this.accountContextService.refresh();
        void this.loadServicesState();
    }

    toggleTheme(): void {
        this.themeService.toggle();
        this.isDark = this.themeService.get() === 'dark';
    }

    navigate(route: string): void {
        this.router.navigateByUrl(route);
        this.closeSidenav.emit();
    }

    canNavigate(item: NavItem): boolean {
        if (item.requiresService) return this.hasOrganization && this.hasServices;
        return !item.requiresOrganization || this.hasOrganization;
    }

    isVisible(item: NavItem): boolean {
        if (!item.roles?.length) return true;
        const context = this.accountContextService.snapshot;
        return (context.isManager && item.roles.includes('manager'))
            || (context.isOperator && item.roles.includes('operator'));
    }

    get isManager(): boolean {
        return this.accountContextService.snapshot.isManager;
    }

    getDisabledTooltip(item: NavItem): string {
        if (this.canNavigate(item)) return '';
        return item.requiresService && this.hasOrganization
            ? 'Crea prima un servizio'
            : 'Crea prima un\'organizzazione';
    }

    navigateItem(item: NavItem): void {
        if (!this.canNavigate(item)) return;
        this.navigate(item.route);
    }

    get hasOrganization(): boolean {
        return this.selectedOrgId > 0 && this.organizations.length > 0;
    }

    private async loadServicesState(): Promise<void> {
        if (!this.hasOrganization) {
            this.hasServices = false;
            return;
        }
        try {
            const services = await this.servicesService.getServicesbyIDOrganization(this.selectedOrgId);
            this.hasServices = services.length > 0;
        } catch {
            this.hasServices = false;
        }
    }

    async logout(): Promise<void> {
        await this.authService.logout();
    }

    getInitials(user: any): string {
        if (!user) return '?';
        return Utility.getInitials(`${user.name ?? ''} ${user.surname ?? ''}`);
    }

    isActive(route: string): boolean {
        return this.currentRoute.startsWith(route);
    }
}
