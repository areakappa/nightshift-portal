import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ServiceShiftCrud } from '../../models/crud/ServiceShiftCrud';
import { ServiceShiftDto } from '../../models/dto/ServiceShiftDto';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { OrganizationService } from '../../services/organization.service';
import { ServicesService } from '../../services/services.service';

interface TimeRange {
    start: number;
    end: number;
}

interface DayModel {
    key: string;
    label: string;
    day: number;
    enabled: boolean;
    expanded: boolean;
    ranges: TimeRange[];
}

interface ContractPreset {
    id: string;
    name: string;
    contractHours: number;
    workingDays: string[];
    defaultRanges: TimeRange[];
}

@Component({
    selector: 'app-service-shifts',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatFormFieldModule,
        MatIconModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatSnackBarModule
    ],
    templateUrl: './service-shifts.component.html',
    styleUrls: ['./service-shifts.component.scss']
})
export class ServiceShiftsComponent implements OnInit {
    service: ServiceDTO | null = null;
    contractHours = 40;
    selectedPresetId = 'p_5x8';
    isLoading = false;
    isSaving = false;
    dayErrors: Record<string, string> = {};

    readonly presets: ContractPreset[] = [
        {
            id: 'p_5x8',
            name: '5x8 (40h)',
            contractHours: 40,
            workingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
            defaultRanges: [this.range(8, 0, 12, 0), this.range(13, 0, 17, 0)]
        },
        {
            id: 'p_6x6',
            name: '6x6 (36h)',
            contractHours: 36,
            workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
            defaultRanges: [this.range(9, 0, 13, 0), this.range(14, 0, 16, 0)]
        }
    ];

    days: DayModel[] = this.buildEmptyDays();

    constructor(
        private servicesService: ServicesService,
        private organizationService: OrganizationService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        const rawService = history.state?.service;
        if (rawService) {
            try {
                this.service = typeof rawService === 'string' ? JSON.parse(rawService) : rawService;
            } catch {
                this.service = null;
            }
        }
    }

    async ngOnInit(): Promise<void> {
        await this.loadShifts();
    }

    get totalConfiguredHours(): number {
        return this.days.reduce(
            (total, day) => total + (day.enabled ? this.dayHours(day) : 0),
            0
        );
    }

    get residualHours(): number {
        return this.contractHours - this.totalConfiguredHours;
    }

    get selectedPreset(): ContractPreset {
        return this.presets.find(preset => preset.id === this.selectedPresetId) ?? this.presets[0];
    }

    async loadShifts(): Promise<void> {
        if (!this.service?.id) return;
        this.isLoading = true;
        try {
            const service = await this.servicesService.getServicebyID(this.service.id);
            if (service) this.service = service;
            this.contractHours = Number(this.service?.weekHours) > 0 ? Number(this.service?.weekHours) : 40;
            const shifts = this.service?.serviceShifts ?? [];
            if (shifts.length > 0) this.applyServiceShifts(shifts);
            else this.applyPreset('all');
        } catch {
            this.snackBar.open('Errore nel caricamento dei giorni e orari', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    onPresetChange(): void {
        this.contractHours = this.selectedPreset.contractHours;
    }

    applySelectedPreset(): void {
        const overwrite = this.days.some(day => day.enabled)
            ? window.confirm('Applicare il preset sovrascrivendo la configurazione settimanale corrente?')
            : true;
        if (overwrite) this.applyPreset('all');
    }

    toggleDay(day: DayModel): void {
        day.enabled = !day.enabled;
        if (day.enabled && day.ranges.length === 0) {
            day.ranges = this.cloneRanges(this.selectedPreset.defaultRanges);
        }
        if (!day.enabled) day.expanded = false;
        this.revalidateAll();
    }

    toggleExpanded(day: DayModel): void {
        if (day.enabled) day.expanded = !day.expanded;
    }

    addRange(day: DayModel): void {
        if (!day.enabled || day.ranges.length >= 2) {
            this.snackBar.open('Il servizio supporta massimo due fasce giornaliere', 'Ok', { duration: 2500 });
            return;
        }
        const last = day.ranges.at(-1);
        const start = last ? Math.min(1410, last.end + 60) : this.hm(9, 0);
        day.ranges.push({ start, end: Math.min(1439, start + 240) });
        this.revalidateAll();
    }

    removeRange(day: DayModel, index: number): void {
        day.ranges.splice(index, 1);
        this.revalidateAll();
    }

    updateTime(day: DayModel, index: number, field: 'start' | 'end', value: string): void {
        const minutes = this.parseTime(value);
        if (minutes !== null) day.ranges[index][field] = minutes;
        this.revalidateAll();
    }

    async save(): Promise<void> {
        if (!this.service?.id || this.isSaving) return;
        this.revalidateAll();
        if (Object.keys(this.dayErrors).length > 0) {
            this.snackBar.open('Correggi gli orari non validi prima di salvare', 'Ok', { duration: 3000 });
            return;
        }

        const enabledDays = this.days.filter(day => day.enabled && day.ranges.length > 0);
        if (enabledDays.length === 0) {
            this.snackBar.open('Configura almeno un giorno lavorativo', 'Ok', { duration: 2500 });
            return;
        }

        this.isSaving = true;
        try {
            const organizationId = this.service.idorganization || this.organizationService.getOrganizationSelectedId();
            const startDate = this.service.startValidityDate ?? '';
            const stopDate = this.service.stopValidityDate ?? '';
            const payload = enabledDays.map(day => {
                const first = day.ranges[0];
                const second = day.ranges[1];
                return new ServiceShiftCrud(
                    organizationId,
                    this.service!.id,
                    this.fmtTime(first.start),
                    this.fmtTime(first.end),
                    second ? this.fmtTime(second.start) : '',
                    second ? this.fmtTime(second.end) : '',
                    day.day,
                    startDate,
                    stopDate,
                    1
                );
            });
            await this.servicesService.postServiceShifts(payload);
            this.snackBar.open('Giorni e orari salvati', 'Ok', { duration: 2500 });
            await this.loadShifts();
        } catch {
            this.snackBar.open('Errore nel salvataggio dei giorni e orari', 'Chiudi', { duration: 3000 });
        } finally {
            this.isSaving = false;
            this.cdr.detectChanges();
        }
    }

    dayHours(day: DayModel): number {
        return day.ranges.reduce((total, range) => total + Math.max(0, range.end - range.start), 0) / 60;
    }

    fmtTime(minutes: number): string {
        return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    }

    fmtRange(range: TimeRange): string {
        return `${this.fmtTime(range.start)}–${this.fmtTime(range.end)}`;
    }

    goBack(): void {
        this.router.navigateByUrl('/service-detail', { state: { service: JSON.stringify(this.service) } });
    }

    private applyPreset(mode: 'all' | 'empty'): void {
        const preset = this.selectedPreset;
        this.contractHours = preset.contractHours;
        for (const day of this.days) {
            const workingDay = preset.workingDays.includes(day.key);
            if (!workingDay && mode === 'all') {
                day.enabled = false;
                day.expanded = false;
                day.ranges = [];
                continue;
            }
            if (!workingDay) continue;
            day.enabled = true;
            if (mode === 'all' || day.ranges.length === 0) {
                day.ranges = this.cloneRanges(preset.defaultRanges);
            }
        }
        this.expandFirstEnabledDay();
        this.revalidateAll();
    }

    private applyServiceShifts(shifts: ServiceShiftDto[]): void {
        this.days = this.buildEmptyDays();
        for (const shift of shifts) {
            if (shift.state <= 0) continue;
            const day = this.days.find(candidate => candidate.day === this.normalizeDay(shift.day));
            if (!day) continue;
            day.enabled = true;
            this.pushRange(day, shift.startMorningDate, shift.stopMorningDate);
            this.pushRange(day, shift.startAfternoonDate, shift.stopAfternoonDate);
        }
        for (const day of this.days) day.ranges.sort((left, right) => left.start - right.start);
        this.expandFirstEnabledDay();
        this.revalidateAll();
    }

    private pushRange(day: DayModel, startValue?: string | null, endValue?: string | null): void {
        const start = this.parseTime(startValue);
        const end = this.parseTime(endValue);
        if (start !== null && end !== null && end > start) day.ranges.push({ start, end });
    }

    private revalidateAll(): void {
        this.dayErrors = {};
        for (const day of this.days.filter(candidate => candidate.enabled)) {
            if (day.ranges.length === 0) {
                this.dayErrors[day.key] = 'Aggiungi almeno una fascia oraria.';
                continue;
            }
            if (day.ranges.some(range => range.end <= range.start)) {
                this.dayErrors[day.key] = 'L’orario finale deve essere successivo a quello iniziale.';
                continue;
            }
            const sorted = [...day.ranges].sort((left, right) => left.start - right.start);
            if (sorted.some((range, index) => index > 0 && range.start < sorted[index - 1].end)) {
                this.dayErrors[day.key] = 'Le fasce orarie non possono sovrapporsi.';
            }
        }
    }

    private buildEmptyDays(): DayModel[] {
        return [
            { key: 'mon', label: 'Lunedì', day: 1 },
            { key: 'tue', label: 'Martedì', day: 2 },
            { key: 'wed', label: 'Mercoledì', day: 3 },
            { key: 'thu', label: 'Giovedì', day: 4 },
            { key: 'fri', label: 'Venerdì', day: 5 },
            { key: 'sat', label: 'Sabato', day: 6 },
            { key: 'sun', label: 'Domenica', day: 7 }
        ].map(day => ({ ...day, enabled: false, expanded: false, ranges: [] }));
    }

    private expandFirstEnabledDay(): void {
        this.days.forEach(day => day.expanded = false);
        const first = this.days.find(day => day.enabled);
        if (first) first.expanded = true;
    }

    private parseTime(value?: string | null): number | null {
        if (!value) return null;
        const match = /(\d{1,2}):(\d{2})/.exec(value);
        if (match) return this.hm(Number(match[1]), Number(match[2]));
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : this.hm(date.getHours(), date.getMinutes());
    }

    private normalizeDay(day: number): number {
        return day === 0 ? 7 : day;
    }

    private range(startHour: number, startMinute: number, endHour: number, endMinute: number): TimeRange {
        return { start: this.hm(startHour, startMinute), end: this.hm(endHour, endMinute) };
    }

    private cloneRanges(ranges: TimeRange[]): TimeRange[] {
        return ranges.map(range => ({ ...range }));
    }

    private hm(hours: number, minutes: number): number {
        return Math.max(0, Math.min(1439, hours * 60 + minutes));
    }
}
