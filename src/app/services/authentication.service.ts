import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticateUser } from '../models/authenticateUser';
import { Utility } from '../models/utility';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { OrganizationService } from './organization.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServicesService } from './services.service';
import { RoleService } from './role.service';
import { PushTokenService } from './push-token.service';

// localStorage keys for "keep me logged in" (replaces capacitor-secure-storage)
export const KEEP_ACCESS_KEY = 'keepAccess';
export const USERNAME_KEY = 'savedUsername';
export const PASSWORD_KEY = 'savedPassword';

const SELECTED_SERVICE_KEY = 'selectedServiceId';
const AIRTIME_CHECK_INTERVAL = 30000;

@Injectable({ providedIn: 'root' })
export class AuthenticationService {

    private authenticateUrl = `${environment.api}/api/authenticate`;
    private _user?: AuthenticateUser;
    private _airTimeTimer: any;
    private _airTimeInterval: any;
    private checkAndLogInPromise: Promise<boolean> | null = null;
    private pendingLoginTarget: { url: string; state?: any } | null = null;
    private _mainPage = 'home';
    public get mainPage() { return this._mainPage; }

    constructor(
        private router: Router,
        private organizationService: OrganizationService,
        private snackBar: MatSnackBar,
        private http: HttpClient,
        private servicesService: ServicesService,
        private roleService: RoleService,
        private pushTokenService: PushTokenService
    ) { }

    public async login(username: string, password: string, navigate = true): Promise<AuthenticateUser> {
        const user = await firstValueFrom(this.http.post<AuthenticateUser>(`${this.authenticateUrl}/login`, { username, password }));
        await this.init(user, navigate);
        return user;
    }

    public async requestPasswordRecovery(email: string): Promise<boolean> {
        return await firstValueFrom(this.http.post<boolean>(`${this.authenticateUrl}/ForgotPassword`, { email }));
    }

    public async checkAndLogIn(target?: { url: string; state?: any }): Promise<boolean> {
        if (target?.url) {
            this.pendingLoginTarget = target;
        }
        if (this.checkAndLogInPromise) {
            return await this.checkAndLogInPromise;
        }
        this.checkAndLogInPromise = this.checkAndLogInInternal();
        try {
            return await this.checkAndLogInPromise;
        } finally {
            this.checkAndLogInPromise = null;
        }
    }

    public async updateToken(refreshToken: string): Promise<any> {
        sessionStorage.removeItem('token');
        const updateToken = await firstValueFrom(this.http.post<any>(`${this.authenticateUrl}/UpdateToken`, { refresh_token: refreshToken }));
        sessionStorage.setItem('token', updateToken.token);
        sessionStorage.setItem('expires', updateToken.expires);
        sessionStorage.setItem('refreshToken', updateToken.refreshToken);
        return updateToken;
    }

    public async logout(): Promise<void> {
        await this.logoutWithState();
    }

    public async logoutWithState(loginState?: Record<string, unknown>): Promise<void> {
        this.clearAirTime();
        this._mainPage = 'home';
        const authToken = this._user?.token;

        try {
            if (!Utility.isNullOrEmpty(authToken)) {
                await firstValueFrom(this.http.get(`${this.authenticateUrl}/logout`, { headers: Utility.getAuthHeader(authToken) }));
            }
        } catch (e) {
            console.error(e);
        }

        sessionStorage.removeItem('token');
        sessionStorage.removeItem('expires');
        sessionStorage.removeItem('refreshToken');
        localStorage.removeItem('token');
        localStorage.removeItem('expires');
        localStorage.removeItem('refreshToken');

        try {
            await this.deleteStorage();
        } catch (e) {
            console.error('Errore durante la pulizia dello storage in logout', e);
        }

        this._user = undefined;
        this.pendingLoginTarget = null;
        await this.pushTokenService.setCurrentUserId(null);
        this.organizationService.setOrganizationSelectedId(0);

        if (loginState) {
            history.replaceState({ ...history.state, ...loginState }, '', '/login');
        }
        await this.router.navigate(['/login'], { replaceUrl: true });
    }

    public async deleteStorage(): Promise<void> {
        localStorage.removeItem('firebaseToken');
        localStorage.removeItem('firebaseTokenUserId');
        localStorage.removeItem(SELECTED_SERVICE_KEY);
        localStorage.setItem(KEEP_ACCESS_KEY, 'false');
        localStorage.removeItem(USERNAME_KEY);
        localStorage.removeItem(PASSWORD_KEY);
    }

    public isAuthenticated(): boolean {
        return this._user !== undefined;
    }

    public getUser(): AuthenticateUser | undefined {
        return this._user;
    }

    private async init(user: AuthenticateUser, navigate = true): Promise<void> {
        sessionStorage.setItem('token', user.token);
        sessionStorage.setItem('expires', user.expires);
        sessionStorage.setItem('refreshToken', user.refreshToken);
        this._user = user;
        await this.pushTokenService.setCurrentUserId(user.id);
        await this.startAirTime();

        if (navigate) {
            const targetPage = await this.determineInitialPage();
            if (!this.isAuthenticated()) return;
            this.router.navigateByUrl(targetPage.url, targetPage.state ? { state: targetPage.state } : undefined);
        }
    }

    public clearAirTime() {
        if (this._airTimeTimer) clearInterval(this._airTimeTimer);
        if (this._airTimeInterval) clearInterval(this._airTimeInterval);
        this._airTimeTimer = undefined;
        this._airTimeInterval = undefined;
    }

    public async startAirTime() {
        this.clearAirTime();
        await this.setAirtimeInterval();
    }

    async setAirtimeInterval() {
        const check = await this.check();
        if (!check) return false;
        this._airTimeInterval = setInterval(async () => await this.check(), AIRTIME_CHECK_INTERVAL);
        return true;
    }

    public async check(): Promise<boolean> {
        try {
            const expiresAt = sessionStorage.getItem('expires');
            if (!expiresAt) return await this.setCheckFailed();
            const now = new Date().getTime();
            const expires = parseInt(expiresAt, 10);
            if (now > expires) return await this.setCheckFailed();
            return true;
        } catch (e) {
            return await this.setCheckFailed();
        }
    }

    private async setCheckFailed(): Promise<boolean> {
        const keepAccess = localStorage.getItem(KEEP_ACCESS_KEY) === 'true';
        if (keepAccess) {
            const refreshToken = sessionStorage.getItem('refreshToken');
            if (refreshToken) {
                await this.updateToken(refreshToken);
                return true;
            }
        }
        await this.logout();
        return false;
    }

    public saveSelectedServiceId(serviceId: number): void {
        localStorage.setItem(SELECTED_SERVICE_KEY, serviceId.toString());
    }

    public getSelectedServiceId(): number | null {
        const stored = localStorage.getItem(SELECTED_SERVICE_KEY);
        return stored ? parseInt(stored, 10) : null;
    }

    public clearSelectedServiceId(): void {
        localStorage.removeItem(SELECTED_SERVICE_KEY);
    }

    public async determineInitialPage(): Promise<{ url: string; state?: any }> {
        try {
            const hasValidSession = await this.ensureOrganizationSelectedId();
            if (!hasValidSession || !this.isAuthenticated()) return { url: '/login' };

            if (this.isOperatorUser()) {
                this.roleService.setRole('operator');
                return { url: '/dashboard' };
            }

            const orgId = this.organizationService.getOrganizationSelectedId();
            if (!orgId) return { url: '/home' };

            const services = await this.servicesService.getServicesbyIDOrganization(orgId);
            if (services.length === 0) return { url: '/home' };

            for (const service of services) {
                const teamCoverage = await this.servicesService.getTeamServiceRoles(service.id);
                const hasConfiguredShifts = (service.serviceShifts?.length ?? 0) > 0;
                const missingRoles = teamCoverage?.totalRolesToCoverage ?? 0;
                const ready = this.isServiceActive(service) && hasConfiguredShifts && missingRoles === 0;
                if (!ready) return { url: '/home' };
            }

            this.roleService.setRole('organizer');
            return { url: '/dashboard' };
        } catch (error) {
            console.error('Errore nel determinare la pagina iniziale:', error);
            return this.isAuthenticated() ? { url: '/home' } : { url: '/login' };
        }
    }

    private isOperatorUser(): boolean {
        return !!this._user?.isUser && !this._user?.isCustomerAdmin;
    }

    private async ensureOrganizationSelectedId(): Promise<boolean> {
        const userId = this._user?.id ?? 0;
        if (!userId) return false;
        try {
            const organizationsTeams = await this.organizationService.getOrganizationsTeams(userId);
            if (!organizationsTeams || organizationsTeams.length === 0) {
                this.organizationService.setOrganizationSelectedId(0);
                return true;
            }
            const currentOrganizationId = this.organizationService.getOrganizationSelectedId();
            const hasValidCurrentOrganization = organizationsTeams.some(
                (item) => item.organization?.id === currentOrganizationId
            );
            if (hasValidCurrentOrganization) return true;
            const firstOrganizationId = organizationsTeams[0]?.organization?.id ?? 0;
            this.organizationService.setOrganizationSelectedId(firstOrganizationId);
            return true;
        } catch (error) {
            console.error('Errore inizializzazione organizzazione selezionata:', error);
            return true;
        }
    }

    private isServiceActive(service: { state: number; startValidityDate: string; stopValidityDate: string | null }): boolean {
        const now = new Date();
        const startDate = new Date(service.startValidityDate);
        const endDate = service.stopValidityDate ? new Date(service.stopValidityDate) : null;
        return service.state === 1 && startDate <= now && (!endDate || endDate >= now);
    }

    private async checkAndLogInInternal(): Promise<boolean> {
        const initialTarget = this.pendingLoginTarget;

        if (this.isAuthenticated()) {
            if (initialTarget?.url) {
                await this.router.navigate([initialTarget.url], initialTarget.state ? { state: initialTarget.state } : undefined);
                this.pendingLoginTarget = null;
            }
            return true;
        }

        const keepAccess = localStorage.getItem(KEEP_ACCESS_KEY) === 'true';
        if (!keepAccess) {
            await this.router.navigate(['/login'], initialTarget ? { state: this.buildLoginRedirectState(initialTarget) } : undefined);
            return false;
        }

        const username = localStorage.getItem(USERNAME_KEY) ?? '';
        const password = localStorage.getItem(PASSWORD_KEY) ?? '';

        try {
            await this.login(username, password, false);
            if (!this.isAuthenticated()) return false;
            const finalTarget = this.pendingLoginTarget;
            if (finalTarget?.url) {
                await this.router.navigate([finalTarget.url], finalTarget.state ? { state: finalTarget.state } : undefined);
                this.pendingLoginTarget = null;
            } else {
                const initialPage = await this.determineInitialPage();
                if (!this.isAuthenticated()) return false;
                await this.router.navigate([initialPage.url], initialPage.state ? { state: initialPage.state } : undefined);
            }
            return true;
        } catch (error) {
            console.error(error);
            this.snackBar.open('Errore nel login', 'Chiudi', { duration: 5000 });
            await this.router.navigate(['/login'], initialTarget ? { state: this.buildLoginRedirectState(initialTarget) } : undefined);
            return false;
        }
    }

    private buildLoginRedirectState(target: { url: string; state?: any }): { afterLoginUrl: string; afterLoginState?: any } {
        return { afterLoginUrl: target.url, afterLoginState: target.state };
    }
}
