import { inject } from '@angular/core';
import { HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthenticationService } from '../services/authentication.service';

export const tokenInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
    const authService = inject(AuthenticationService);
    const token = sessionStorage.getItem('token');

    let authReq = req;
    if (token) {
        authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                const refreshToken = sessionStorage.getItem('refreshToken');
                if (refreshToken) {
                    return from(authService.updateToken(refreshToken)).pipe(
                        switchMap((newTokens: any) => {
                            sessionStorage.setItem('token', newTokens.token);
                            sessionStorage.setItem('expires', newTokens.expires);
                            sessionStorage.setItem('refreshToken', newTokens.refreshToken);
                            const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${newTokens.token}` } });
                            return next(retryReq);
                        })
                    );
                } else {
                    authService.logout();
                }
            }
            return throwError(() => error);
        })
    );
};
