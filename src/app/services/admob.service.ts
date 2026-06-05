import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AdmobService {
    async initialize(): Promise<void> {
        // AdMob not available in web portal
    }

    async showInterstitial(): Promise<void> {
        // AdMob not available in web portal
    }
}
