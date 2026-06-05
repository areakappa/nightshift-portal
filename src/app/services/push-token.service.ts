import { Injectable } from '@angular/core';
import { UsersService } from './users.service';

const SYNCED_FIREBASE_TOKEN_KEY = 'firebaseToken';
const SYNCED_FIREBASE_TOKEN_USER_KEY = 'firebaseTokenUserId';

@Injectable({ providedIn: 'root' })
export class PushTokenService {
    private currentUserId: number | null = null;

    constructor(private usersService: UsersService) { }

    public async initialize(): Promise<void> {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                const token = btoa(JSON.stringify(subscription));
                localStorage.setItem('firebaseDeviceToken', token);
                await this.syncTokenForCurrentUser();
            }
        } catch (e) {
            console.warn('Push API not available:', e);
        }
    }

    public async setCurrentUserId(userId: number | null): Promise<void> {
        this.currentUserId = userId && userId > 0 ? userId : null;
        await this.syncTokenForCurrentUser();
    }

    private async syncTokenForCurrentUser(): Promise<void> {
        if (!this.currentUserId) return;

        const token = localStorage.getItem('firebaseDeviceToken');
        if (!token) return;

        const syncedToken = localStorage.getItem(SYNCED_FIREBASE_TOKEN_KEY);
        const syncedUserId = localStorage.getItem(SYNCED_FIREBASE_TOKEN_USER_KEY);

        if (syncedToken === token && syncedUserId === String(this.currentUserId)) return;

        try {
            await this.usersService.updateFirebaseToken(this.currentUserId, token);
            localStorage.setItem(SYNCED_FIREBASE_TOKEN_KEY, token);
            localStorage.setItem(SYNCED_FIREBASE_TOKEN_USER_KEY, String(this.currentUserId));
        } catch (e) {
            console.warn('Errore sincronizzazione push token:', e);
        }
    }
}
