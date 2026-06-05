import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { GoogleMapsModule } from '@angular/google-maps';
import { ServicesService } from '../../../services/services.service';
import { OrganizationService } from '../../../services/organization.service';
import { OpenAiService } from '../../../services/openai.service';
import { OpenAiPromptService } from '../../../services/openai-prompt.service';
import { ServiceDTO } from '../../../models/dto/serviceDTO';
import { OrganizationDto } from '../../../models/dto/OrganizationDto';
import { ServiceCrud } from '../../../models/crud/ServiceCrud';
import { ServiceRoleCrud } from '../../../models/crud/ServiceRoleCrud';
import { ServiceShiftCrud } from '../../../models/crud/ServiceShiftCrud';
import { ServiceContextAIResponse } from '../../../models/generic/openAi/ServiceContextAIResponse';
import { ServiceRoleAIResponse } from '../../../models/generic/openAi/ServiceRoleAIResponse';
import { OpenAIRequest } from '../../../models/generic/openAi/OpenAIRequest';
import { environment } from '../../../../environments/environment';

type ServiceFor = 'internal' | 'external';

interface WorkDay {
    full: string;
    short: string;
    startMorning: string;
    stopMorning: string;
    startAfternoon: string;
    stopAfternoon: string;
    selected: boolean;
    index: number;
    isRestDay: boolean;
}

@Component({
    selector: 'app-service-wizard',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule,
        MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
        MatFormFieldModule, MatInputModule, MatStepperModule, MatSnackBarModule,
        MatDividerModule, MatRadioModule, MatCheckboxModule, GoogleMapsModule
    ],
    templateUrl: './service-wizard.component.html',
    styleUrls: ['./service-wizard.component.scss']
})
export class ServiceWizardComponent implements OnInit {
    isSaving = false;
    isLoadingAI = false;
    serviceTypeSelected: ServiceFor | '' = '';
    createdService: ServiceDTO | null = null;
    organizationSelected: OrganizationDto | null = null;
    serviceContextAIResponse: ServiceContextAIResponse | null = null;
    apiLoaded = false;
    isGeocoding = false;
    mapCenter: google.maps.LatLngLiteral = { lat: 41.9028, lng: 12.4964 };
    mapZoom = 12;
    mapOptions: google.maps.MapOptions = {
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
    };
    markerOptions: google.maps.MarkerOptions = { draggable: false };
    private addressSearchTimer: ReturnType<typeof setTimeout> | null = null;
    placePredictions: google.maps.places.AutocompletePrediction[] = [];
    isLoadingPlaces = false;
    private placesSessionToken: google.maps.places.AutocompleteSessionToken | null = null;

    anagraphicForm: FormGroup;
    descriptionForm: FormGroup;
    addressForm: FormGroup;

    days: WorkDay[] = [
        { full: 'Lunedì', short: 'LUN', startMorning: '09:00', stopMorning: '12:00', startAfternoon: '13:00', stopAfternoon: '18:00', selected: true, index: 1, isRestDay: false },
        { full: 'Martedì', short: 'MAR', startMorning: '09:00', stopMorning: '12:00', startAfternoon: '13:00', stopAfternoon: '18:00', selected: true, index: 2, isRestDay: false },
        { full: 'Mercoledì', short: 'MER', startMorning: '09:00', stopMorning: '12:00', startAfternoon: '13:00', stopAfternoon: '18:00', selected: true, index: 3, isRestDay: false },
        { full: 'Giovedì', short: 'GIO', startMorning: '09:00', stopMorning: '12:00', startAfternoon: '13:00', stopAfternoon: '18:00', selected: true, index: 4, isRestDay: false },
        { full: 'Venerdì', short: 'VEN', startMorning: '09:00', stopMorning: '12:00', startAfternoon: '13:00', stopAfternoon: '18:00', selected: true, index: 5, isRestDay: false },
        { full: 'Sabato', short: 'SAB', startMorning: '', stopMorning: '', startAfternoon: '', stopAfternoon: '', selected: false, index: 6, isRestDay: true },
        { full: 'Domenica', short: 'DOM', startMorning: '', stopMorning: '', startAfternoon: '', stopAfternoon: '', selected: false, index: 7, isRestDay: true }
    ];

    constructor(
        private fb: FormBuilder,
        private servicesService: ServicesService,
        private orgService: OrganizationService,
        private openAiService: OpenAiService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        const today = this.toDateInputValue(new Date());
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);

        this.anagraphicForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            startDate: [today, Validators.required],
            endDate: [this.toDateInputValue(nextYear)]
        });
        this.descriptionForm = this.fb.group({
            serviceType: ['', [Validators.required, Validators.maxLength(280)]]
        });
        this.addressForm = this.fb.group({
            address: ['', Validators.required]
        });
        this.addressForm.get('address')?.valueChanges.subscribe(() => this.queueAddressSearch());
        void this.loadOrganization();
    }

    ngOnInit(): void {
        void this.loadGoogleMaps();
    }

    async loadOrganization(): Promise<void> {
        try {
            const organizations = await this.orgService.getOrganizations();
            this.organizationSelected = organizations.find(org => org.id === this.orgService.getOrganizationSelectedId()) ?? null;
        } catch {
            this.organizationSelected = null;
        }
    }

    goNext(stepper: MatStepper, form?: FormGroup): void {
        if (form?.invalid) {
            form.markAllAsTouched();
            return;
        }
        if (form === this.addressForm) {
            void this.geocodeAddress();
        }
        stepper.next();
    }

    goFromType(stepper: MatStepper): void {
        if (!this.serviceTypeSelected) {
            this.snackBar.open('Seleziona il tipo di servizio', 'Ok', { duration: 2500 });
            return;
        }
        stepper.next();
    }

    async analyzeDescription(stepper: MatStepper): Promise<void> {
        if (this.descriptionForm.invalid) {
            this.descriptionForm.markAllAsTouched();
            return;
        }

        this.isLoadingAI = true;
        stepper.next();
        try {
            const ccnl = this.organizationSelected?.ccnlcontract || 'Commercio';
            const serviceDescription = this.descriptionForm.value.serviceType;
            const response = await this.openAiService.getOpenAIResponse(
                new OpenAIRequest('', OpenAiPromptService.getRolesPrompt(serviceDescription, ccnl))
            );
            this.serviceContextAIResponse = this.parseJsonObject<ServiceContextAIResponse>(response.response);

            if (!this.serviceContextAIResponse.coerente_con_ccnl) {
                this.snackBar.open('Descrizione non compatibile con il CCNL della tua organizzazione.', 'Ok', { duration: 3500 });
                stepper.previous();
                return;
            }
            if (this.serviceContextAIResponse.indice < 50) {
                this.snackBar.open('Descrizione poco chiara. Aggiungi più dettagli.', 'Ok', { duration: 3500 });
                stepper.previous();
                return;
            }
            this.serviceContextAIResponse.ruoli.forEach(role => role.selected = true);
        } catch {
            this.snackBar.open('Errore nell\'analisi del servizio. Riprova.', 'Chiudi', { duration: 3500 });
            stepper.previous();
        } finally {
            this.isLoadingAI = false;
            this.cdr.detectChanges();
        }
    }

    goFromRoles(stepper: MatStepper): void {
        if (this.getSelectedRoles().length === 0) {
            this.snackBar.open('Seleziona almeno un ruolo lavorativo', 'Ok', { duration: 2500 });
            return;
        }
        stepper.next();
    }

    goFromShifts(stepper: MatStepper): void {
        if (this.getSelectedDays().length === 0) {
            this.snackBar.open('Seleziona almeno un giorno lavorativo', 'Ok', { duration: 2500 });
            return;
        }
        void this.createService(stepper);
    }

    async createService(stepper: MatStepper): Promise<void> {
        if (this.anagraphicForm.invalid || this.descriptionForm.invalid || this.addressForm.invalid) {
            this.anagraphicForm.markAllAsTouched();
            this.descriptionForm.markAllAsTouched();
            this.addressForm.markAllAsTouched();
            return;
        }

        this.isSaving = true;
        try {
            const orgId = this.orgService.getOrganizationSelectedId();
            const description = `${this.descriptionForm.value.serviceType}\nIndirizzo: ${this.addressForm.value.address}`;
            const serviceCrud = new ServiceCrud(
                orgId,
                0,
                0,
                0,
                this.anagraphicForm.value.name.trim(),
                description.trim(),
                this.anagraphicForm.value.startDate,
                1
            );
            serviceCrud.StopValidityDate = this.anagraphicForm.value.endDate || null;

            this.createdService = await this.servicesService.postService(serviceCrud);
            await this.saveRoles();
            await this.saveShifts();
            this.snackBar.open('Servizio creato con successo!', 'Ok', { duration: 2500 });
            stepper.next();
        } catch {
            this.snackBar.open('Errore durante la creazione del servizio', 'Chiudi', { duration: 3500 });
        } finally {
            this.isSaving = false;
            this.cdr.detectChanges();
        }
    }

    private async saveRoles(): Promise<void> {
        if (!this.createdService) return;
        for (const role of this.getSelectedRoles()) {
            const roleCrud = new ServiceRoleCrud(role.ruolo, role.mansione ?? '', 0, 1);
            roleCrud.Idservice = this.createdService.id;
            await this.servicesService.postServiceRole(roleCrud);
        }
    }

    private async saveShifts(): Promise<void> {
        if (!this.createdService) return;
        const orgId = this.orgService.getOrganizationSelectedId();
        const startDate = this.anagraphicForm.value.startDate;
        const stopDate = this.anagraphicForm.value.endDate || startDate;
        const shifts = this.getSelectedDays().map(day => new ServiceShiftCrud(
            orgId,
            this.createdService!.id,
            day.isRestDay ? '' : day.startMorning,
            day.isRestDay ? '' : day.stopMorning,
            day.isRestDay ? '' : day.startAfternoon,
            day.isRestDay ? '' : day.stopAfternoon,
            day.index,
            startDate,
            stopDate,
            1
        ));
        if (shifts.length) await this.servicesService.postServiceShifts(shifts);
    }

    toggleRoleSelection(role: ServiceRoleAIResponse): void {
        role.selected = !role.selected;
    }

    addCustomRole(): void {
        const roleName = window.prompt('Nome del ruolo');
        if (!roleName?.trim()) return;
        const roleDescription = window.prompt('Descrizione mansioni') ?? '';
        if (!this.serviceContextAIResponse) {
            this.serviceContextAIResponse = { indice: 100, servizio: '', contesto: '', ruoli: [], punti_non_chiari: [], coerente_con_ccnl: true };
        }
        this.serviceContextAIResponse.ruoli.push({ ruolo: roleName.trim(), mansione: roleDescription.trim(), selected: true });
    }

    getSelectedRoles(): ServiceRoleAIResponse[] {
        return this.serviceContextAIResponse?.ruoli.filter(role => role.selected) ?? [];
    }

    toggleDay(day: WorkDay): void {
        day.selected = !day.selected;
    }

    toggleRestDay(day: WorkDay): void {
        day.isRestDay = !day.isRestDay;
        if (day.isRestDay) {
            day.startMorning = '';
            day.stopMorning = '';
            day.startAfternoon = '';
            day.stopAfternoon = '';
            return;
        }
        day.startMorning = '09:00';
        day.stopMorning = '12:00';
        day.startAfternoon = '13:00';
        day.stopAfternoon = '18:00';
    }

    getSelectedDays(): WorkDay[] {
        return this.days.filter(day => day.selected);
    }

    getCharCount(): number {
        return this.descriptionForm.value.serviceType?.length ?? 0;
    }

    createTeamYes(): void {
        if (!this.createdService) return;
        this.router.navigateByUrl('/wizard/team', { state: { service: JSON.stringify(this.createdService) } });
    }

    createTeamNo(): void {
        this.router.navigate(['/services']);
    }

    cancel(): void { this.router.navigate(['/services']); }

    private queueAddressSearch(): void {
        if (this.addressSearchTimer) clearTimeout(this.addressSearchTimer);
        this.addressSearchTimer = setTimeout(() => void this.loadPlacePredictions(), 350);
    }

    private async loadGoogleMaps(): Promise<void> {
        if (!environment.googleMapsApiKey) return;
        if (window.google?.maps?.places) {
            this.apiLoaded = true;
            return;
        }

        try {
            if (window.google?.maps && (google.maps as any).importLibrary) {
                await (google.maps as any).importLibrary('places');
                this.apiLoaded = true;
                return;
            }

            await new Promise<void>((resolve, reject) => {
                const existingScript = document.getElementById('google-maps-api');
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
            this.apiLoaded = true;
            await this.geocodeAddress();
        } finally {
            this.cdr.detectChanges();
        }
    }

    private async loadPlacePredictions(): Promise<void> {
        const input = this.addressForm.value.address?.trim();
        if (!this.apiLoaded || !window.google?.maps?.places || !input || input.length < 3) {
            this.placePredictions = [];
            this.cdr.detectChanges();
            return;
        }

        this.isLoadingPlaces = true;
        if (!this.placesSessionToken) {
            this.placesSessionToken = new google.maps.places.AutocompleteSessionToken();
        }

        try {
            const service = new google.maps.places.AutocompleteService();
            const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve) => {
                service.getPlacePredictions(
                    {
                        input,
                        sessionToken: this.placesSessionToken ?? undefined,
                        componentRestrictions: { country: 'it' },
                        types: ['establishment', 'geocode']
                    },
                    (results, status) => {
                        resolve(status === google.maps.places.PlacesServiceStatus.OK ? results ?? [] : []);
                    }
                );
            });
            this.placePredictions = predictions;
        } finally {
            this.isLoadingPlaces = false;
            this.cdr.detectChanges();
        }
    }

    async selectPlace(prediction: google.maps.places.AutocompletePrediction): Promise<void> {
        this.addressForm.get('address')?.setValue(prediction.description, { emitEvent: false });
        this.placePredictions = [];
        this.isGeocoding = true;

        try {
            const geocoder = new google.maps.Geocoder();
            const response = await geocoder.geocode({ placeId: prediction.place_id });
            const location = response.results[0]?.geometry.location;
            if (!location) return;
            this.mapCenter = { lat: location.lat(), lng: location.lng() };
            this.mapZoom = 16;
            this.placesSessionToken = null;
        } catch {
            this.snackBar.open('Impossibile recuperare la posizione selezionata', 'Ok', { duration: 2500 });
        } finally {
            this.isGeocoding = false;
            this.cdr.detectChanges();
        }
    }

    async geocodeAddress(): Promise<void> {
        const address = this.addressForm.value.address?.trim();
        if (!this.apiLoaded || !address || !window.google?.maps) return;

        this.placePredictions = [];
        this.isGeocoding = true;
        try {
            const geocoder = new google.maps.Geocoder();
            const response = await geocoder.geocode({ address });
            const location = response.results[0]?.geometry.location;
            if (!location) return;
            this.mapCenter = { lat: location.lat(), lng: location.lng() };
            this.mapZoom = 16;
        } catch {
            this.snackBar.open('Indirizzo non trovato su Google Maps', 'Ok', { duration: 2500 });
        } finally {
            this.isGeocoding = false;
            this.cdr.detectChanges();
        }
    }

    private toDateInputValue(date: Date): string {
        return date.toISOString().slice(0, 10);
    }

    private parseJsonObject<T>(response: string): T {
        const cleanedResponse = response.replace(/```json/gi, '').replace(/```/g, '').trim();
        const objectStart = cleanedResponse.indexOf('{');
        const objectEnd = cleanedResponse.lastIndexOf('}');
        const json = objectStart >= 0 && objectEnd >= objectStart
            ? cleanedResponse.slice(objectStart, objectEnd + 1)
            : cleanedResponse;
        return JSON.parse(json) as T;
    }
}
