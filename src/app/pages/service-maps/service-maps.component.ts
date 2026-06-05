import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GoogleMapsModule } from '@angular/google-maps';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-service-maps',
    standalone: true,
    imports: [
        CommonModule, MatCardModule, MatButtonModule,
        MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
        GoogleMapsModule
    ],
    templateUrl: './service-maps.component.html',
    styleUrls: ['./service-maps.component.scss']
})
export class ServiceMapsComponent implements OnInit {
    service: ServiceDTO | null = null;
    mapCenter: google.maps.LatLngLiteral = { lat: 41.9028, lng: 12.4964 }; // Roma default
    mapZoom = 12;
    mapOptions: google.maps.MapOptions = { mapTypeId: 'roadmap', disableDefaultUI: false };
    markerOptions: google.maps.MarkerOptions = { draggable: false };
    apiLoaded = false;

    constructor(private router: Router, private snackBar: MatSnackBar) {
        const state = history.state;
        if (state?.service) {
            try { this.service = JSON.parse(state.service); } catch { }
        }
    }

    ngOnInit(): void {
        // Try to get coordinates from service if available
        const svc = this.service as any;
        if (svc?.latitude && svc?.longitude) {
            this.mapCenter = { lat: Number(svc.latitude), lng: Number(svc.longitude) };
        } else if (svc?.address?.latitude && svc?.address?.longitude) {
            this.mapCenter = { lat: Number(svc.address.latitude), lng: Number(svc.address.longitude) };
        } else {
            this.getUserLocation();
        }
        this.apiLoaded = !!environment.googleMapsApiKey;
    }

    private getUserLocation(): void {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                pos => { this.mapCenter = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
                () => { /* use default */ }
            );
        }
    }

    goBack(): void {
        this.router.navigateByUrl('/service-detail', { state: { service: JSON.stringify(this.service) } });
    }
}
