import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthenticationService);
    const router = inject(Router);
    return authService.isAuthenticated() ? true : router.parseUrl('/login');
};
