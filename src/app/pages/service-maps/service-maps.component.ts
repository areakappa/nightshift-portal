import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
import { ServicesService } from '../../services/services.service';
import { FormsModule } from '@angular/forms';
import { mStation } from '../../models/dto/mStation';

@Component({
    selector: 'app-service-maps',
    standalone: true,
    imports: [
        CommonModule, FormsModule, MatCardModule, MatButtonModule,
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
    isLoading = true;
    isEditMode = false;
    isSaving = false;
    editableAddress = '';
    loadError = '';

    constructor(
        private router: Router,
        private servicesService: ServicesService,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        const state = history.state;
        if (state?.service) {
            try { this.service = JSON.parse(state.service); } catch { }
        }
    }

    async ngOnInit(): Promise<void> {
        try {
            if (this.service?.id) {
                const refreshedService = await this.servicesService.getServicebyID(this.service.id);
                if (refreshedService) this.service = refreshedService;
            }
            this.editableAddress = this.service?.address?.address1 ?? '';
            this.resolveMapCenter();
            await this.loadGoogleMaps();
        } catch {
            this.loadError = 'Impossibile caricare Google Maps.';
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    private resolveMapCenter(): void {
        const mapX = this.service?.address?.mapX;
        const mapY = this.service?.address?.mapY;
        if (mapX != null && mapY != null) {
            this.mapCenter = { lat: Number(mapX), lng: Number(mapY) };
            this.mapZoom = 16;
            return;
        }
        this.getUserLocation();
    }

    private async loadGoogleMaps(): Promise<void> {
        if (!environment.googleMapsApiKey) {
            this.loadError = 'Google Maps API non configurata.';
            return;
        }
        if (window.google?.maps) {
            this.apiLoaded = true;
            return;
        }

        await new Promise<void>((resolve, reject) => {
            const existingScript = document.getElementById('google-maps-api') as HTMLScriptElement | null;
            if (existingScript) {
                existingScript.addEventListener('load', () => resolve(), { once: true });
                existingScript.addEventListener('error', () => reject(), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.id = 'google-maps-api';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject();
            document.head.appendChild(script);
        });
        this.apiLoaded = !!window.google?.maps;
        if (!this.apiLoaded) this.loadError = 'Google Maps non disponibile.';
    }

    toggleEditMode(): void {
        this.isEditMode = !this.isEditMode;
        this.markerOptions = { ...this.markerOptions, draggable: this.isEditMode };
    }

    async searchAddress(): Promise<void> {
        const address = this.editableAddress.trim();
        if (!address || !window.google?.maps) return;
        try {
            const response = await new google.maps.Geocoder().geocode({ address });
            const location = response.results?.[0]?.geometry?.location;
            if (!location) {
                this.snackBar.open('Indirizzo non trovato', 'Chiudi', { duration: 3000 });
                return;
            }
            this.mapCenter = { lat: location.lat(), lng: location.lng() };
            this.mapZoom = 16;
            this.editableAddress = response.results[0].formatted_address || address;
        } catch {
            this.snackBar.open('Errore nella ricerca dell\'indirizzo', 'Chiudi', { duration: 3000 });
        } finally {
            this.cdr.detectChanges();
        }
    }

    async onMapClick(event: google.maps.MapMouseEvent): Promise<void> {
        if (!this.isEditMode || !event.latLng) return;
        await this.setSelectedPosition(event.latLng.lat(), event.latLng.lng());
    }

    async onMarkerDragEnd(event: google.maps.MapMouseEvent): Promise<void> {
        if (!event.latLng) return;
        await this.setSelectedPosition(event.latLng.lat(), event.latLng.lng());
    }

    async savePosition(): Promise<void> {
        if (!this.service?.idserviceStation) {
            this.snackBar.open('Stazione del servizio non trovata', 'Chiudi', { duration: 3000 });
            return;
        }
        const address = this.editableAddress.trim();
        if (!address) {
            this.snackBar.open('Inserisci un indirizzo valido', 'Chiudi', { duration: 3000 });
            return;
        }

        this.isSaving = true;
        try {
            const station: mStation = {
                id: this.service.idserviceStation,
                idClient: this.service.idclient ?? null,
                idAddress: this.service.address?.id ?? null,
                name: this.service.name,
                description: this.service.description,
                address,
                idaddressType: this.service.address?.idaddressType ?? 1,
                approximativeGPSCoordinate: 0,
                cap: this.service.address?.cap ?? null,
                city: this.service.address?.comune ?? null,
                piano: this.service.address?.piano ?? null,
                porta: this.service.address?.porta ?? null,
                mapX: this.mapCenter.lat,
                civico: this.service.address?.civico ?? '',
                barra: this.service.address?.barra ?? null,
                comune: this.service.address?.comune ?? null,
                idProvincia: this.service.address?.idprovincia ?? null,
                localita: this.service.address?.localita ?? null,
                mapY: this.mapCenter.lng,
                state: this.service.address?.state ?? 1,
                created: this.service.address?.created ?? null
            };
            const saved = await this.servicesService.putStation(this.service.idserviceStation, station);
            if (!saved) {
                this.snackBar.open('Impossibile salvare la posizione', 'Chiudi', { duration: 3000 });
                return;
            }
            if (this.service.address) {
                this.service.address.address1 = address;
                this.service.address.mapX = this.mapCenter.lat;
                this.service.address.mapY = this.mapCenter.lng;
            }
            this.isEditMode = false;
            this.markerOptions = { ...this.markerOptions, draggable: false };
            this.snackBar.open('Posizione aggiornata con successo', 'Ok', { duration: 2500 });
        } catch {
            this.snackBar.open('Errore durante il salvataggio della posizione', 'Chiudi', { duration: 3000 });
        } finally {
            this.isSaving = false;
            this.cdr.detectChanges();
        }
    }

    private async setSelectedPosition(lat: number, lng: number): Promise<void> {
        this.mapCenter = { lat, lng };
        try {
            const response = await new google.maps.Geocoder().geocode({ location: this.mapCenter });
            if (response.results?.[0]?.formatted_address) {
                this.editableAddress = response.results[0].formatted_address;
            }
        } catch {
            // Coordinates remain selectable even if reverse geocoding fails.
        }
        this.cdr.detectChanges();
    }

    private getUserLocation(): void {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                pos => { this.mapCenter = { lat: pos.coords.latitude, lng: pos.coords.longitude }; this.cdr.detectChanges(); },
                () => { /* use default */ }
            );
        }
    }

    goBack(): void {
        this.router.navigateByUrl('/service-detail', { state: { service: JSON.stringify(this.service) } });
    }
}
