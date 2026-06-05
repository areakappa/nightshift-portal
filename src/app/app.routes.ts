import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'initial', pathMatch: 'full' },
    {
        path: 'initial',
        loadComponent: () => import('./pages/initial/initial.component').then(m => m.InitialComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'register',
        loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
    },
    {
        path: 'forgot-password',
        loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
    },
    {
        path: 'activate-account',
        loadComponent: () => import('./pages/activate-account/activate-account.component').then(m => m.ActivateAccountComponent)
    },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
        children: [
            { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
            { path: 'services', loadComponent: () => import('./pages/services/services.component').then(m => m.ServicesComponent) },
            { path: 'service-detail', loadComponent: () => import('./pages/service-detail/service-detail.component').then(m => m.ServiceDetailComponent) },
            { path: 'service-roles', loadComponent: () => import('./pages/service-roles/service-roles.component').then(m => m.ServiceRolesComponent) },
            { path: 'service-shifts', loadComponent: () => import('./pages/service-shifts/service-shifts.component').then(m => m.ServiceShiftsComponent) },
            { path: 'service-schedule', loadComponent: () => import('./pages/service-schedule/service-schedule.component').then(m => m.ServiceScheduleComponent) },
            { path: 'service-maps', loadComponent: () => import('./pages/service-maps/service-maps.component').then(m => m.ServiceMapsComponent) },
            { path: 'team', loadComponent: () => import('./pages/team/team.component').then(m => m.TeamComponent) },
            { path: 'user-wizard', loadComponent: () => import('./pages/user-wizard/user-wizard.component').then(m => m.UserWizardComponent) },
            { path: 'organization-detail', loadComponent: () => import('./pages/organization-detail/organization-detail.component').then(m => m.OrganizationDetailComponent) },
            { path: 'organization-rules', loadComponent: () => import('./pages/organization-rules/organization-rules.component').then(m => m.OrganizationRulesComponent) },
            { path: 'calendar', loadComponent: () => import('./pages/calendar/calendar.component').then(m => m.CalendarComponent) },
            { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
            { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications.component').then(m => m.NotificationsComponent) },
            { path: 'unavailability', loadComponent: () => import('./pages/unavailability/unavailability.component').then(m => m.UnavailabilityComponent) },
            { path: 'wizard/service', loadComponent: () => import('./pages/wizards/service-wizard/service-wizard.component').then(m => m.ServiceWizardComponent) },
            { path: 'wizard/organization', loadComponent: () => import('./pages/wizards/organization-wizard/organization-wizard.component').then(m => m.OrganizationWizardComponent) },
            { path: 'wizard/team', loadComponent: () => import('./pages/wizards/team-wizard/team-wizard.component').then(m => m.TeamWizardComponent) },
        ]
    },
    { path: '**', redirectTo: 'initial' }
];

