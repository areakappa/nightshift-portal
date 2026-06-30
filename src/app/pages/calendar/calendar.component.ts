import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ShiftItemDTO } from '../../models/dto/ShiftItemDTO';
import { ShiftsSearch } from '../../models/generic/Shift/ShiftsSearch';
import { ScheduleService } from '../../services/schedule.service';
import { ServicesService } from '../../services/services.service';
import { OrganizationService } from '../../services/organization.service';
import { AuthenticationService } from '../../services/authentication.service';
import { OrganizationPermissionsService } from '../../services/organization-permissions.service';

type CalendarShift = ShiftItemDTO & {
    serviceId: number;
    serviceName: string;
};

type PositionedCalendarShift = CalendarShift & {
    overlapColumn: number;
    overlapColumns: number;
};

type CalendarServiceFilter = {
    id: number;
    name: string;
    color: string;
};

@Component({
    selector: 'app-calendar',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatChipsModule, MatSnackBarModule, MatTooltipModule
    ],
    templateUrl: './calendar.component.html',
    styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
    shifts: CalendarShift[] = [];
    serviceFilters: CalendarServiceFilter[] = [];
    selectedServiceIds = new Set<number>();
    isLoading = false;
    selectedDate = new Date();
    viewMode: 'day' | 'week' | 'month' = 'week';
    selectedShift: CalendarShift | null = null;
    editStart = '';
    editEnd = '';
    canManageShiftActions = false;
    canViewAllShifts = false;
    processingShiftId: number | null = null;
    private loadPromise: Promise<void> | null = null;
    private readonly serviceColors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ef4444'];

    constructor(
        private scheduleService: ScheduleService,
        private servicesService: ServicesService,
        private organizationService: OrganizationService,
        private authenticationService: AuthenticationService,
        private organizationPermissionsService: OrganizationPermissionsService,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit(): Promise<void> {
        this.canViewAllShifts = await this.organizationPermissionsService.canViewAllShifts();
        this.canManageShiftActions = this.canViewAllShifts;
        await this.loadShifts();
    }

    async loadShifts(): Promise<void> {
        if (this.loadPromise) return this.loadPromise;
        this.loadPromise = this.loadShiftsInternal();
        try {
            await this.loadPromise;
        } finally {
            this.loadPromise = null;
        }
    }

    private async loadShiftsInternal(): Promise<void> {
        this.isLoading = true;
        try {
            const { start, end } = this.getDateRange();
            const orgId = this.organizationService.getOrganizationSelectedId();
            if (!orgId) {
                this.shifts = [];
                this.serviceFilters = [];
                this.selectedServiceIds = new Set<number>();
                return;
            }

            const services = await this.servicesService.getServicesbyIDOrganization(orgId);
            this.serviceFilters = services.map((service, index) => ({
                id: service.id,
                name: service.name,
                color: this.serviceColors[index % this.serviceColors.length]
            }));
            this.initializeSelectedServices();

            const shiftsByService = await Promise.all(
                services.map(async service => (await this.scheduleService.getShiftsByService(
                    new ShiftsSearch(
                        service.id,
                        this.scheduleService.getStringFromDate(start),
                        this.scheduleService.getStringFromDate(end)
                    )
                ).catch(() => [] as ShiftItemDTO[])).map(shift => ({
                    ...shift,
                    serviceId: service.id,
                    serviceName: service.name
                })))
            );
            const userId = this.authenticationService.getUser()?.id;
            this.shifts = shiftsByService.flat()
                .filter(shift => this.canViewAllShifts || shift.idUser === userId || shift.idEmployee === userId)
                .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
            if (this.selectedShift?.idShift) {
                this.selectedShift = this.shifts.find(shift => shift.idShift === this.selectedShift!.idShift) ?? null;
                if (this.selectedShift && !this.selectedServiceIds.has(this.selectedShift.serviceId)) {
                    this.selectedShift = null;
                }
            }
        } catch {
            this.snackBar.open('Errore nel caricamento turni', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    getDateRange(): { start: Date; end: Date } {
        const d = new Date(this.selectedDate);
        if (this.viewMode === 'day') return { start: d, end: d };
        if (this.viewMode === 'week') {
            const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
            const end = new Date(start); end.setDate(start.getDate() + 6);
            return { start, end };
        }
        return { start: new Date(d.getFullYear(), d.getMonth(), 1), end: new Date(d.getFullYear(), d.getMonth() + 1, 0) };
    }

    getWeekDays(): Date[] {
        const { start } = this.getDateRange();
        return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    }

    get timelineDays(): Date[] {
        return this.viewMode === 'day' ? [new Date(this.selectedDate)] : this.getWeekDays();
    }

    readonly timelineHours = Array.from({ length: 24 }, (_, hour) => hour);

    getShiftTop(shift: CalendarShift): number {
        const date = new Date(shift.startDateTime);
        return date.getHours() * 60 + date.getMinutes();
    }

    getShiftHeight(shift: CalendarShift): number {
        const minutes = Math.max(30, Math.round((new Date(shift.endDateTime).getTime() - new Date(shift.startDateTime).getTime()) / 60000));
        return Math.min(minutes, 1440 - this.getShiftTop(shift));
    }

    getShiftTooltip(shift: CalendarShift): string {
        const start = this.formatTime(shift.startDateTime);
        const end = this.formatTime(shift.endDateTime);
        const person = shift.nameEmployee ?? 'Non assegnato';
        const role = shift.role ?? shift.roleName ?? shift.serviceRole;

        return [
            `${start} - ${end}`,
            shift.serviceName,
            person,
            role
        ].filter(Boolean).join('\n');
    }

    getShiftsForDate(date: Date): CalendarShift[] {
        const dateStr = date.toISOString().split('T')[0];
        return this.filteredShifts.filter(s => s.startDateTime?.startsWith(dateStr));
    }

    getPositionedShiftsForDate(date: Date): PositionedCalendarShift[] {
        const shifts = this.getShiftsForDate(date)
            .slice()
            .sort((left, right) =>
                new Date(left.startDateTime).getTime() - new Date(right.startDateTime).getTime() ||
                new Date(left.endDateTime).getTime() - new Date(right.endDateTime).getTime()
            );

        const positioned: PositionedCalendarShift[] = [];
        let index = 0;

        while (index < shifts.length) {
            const cluster: CalendarShift[] = [];
            let clusterEnd = this.shiftEndMs(shifts[index]);

            while (index < shifts.length && this.shiftStartMs(shifts[index]) < clusterEnd) {
                const shift = shifts[index];
                cluster.push(shift);
                clusterEnd = Math.max(clusterEnd, this.shiftEndMs(shift));
                index++;
            }

            const columnEnds: number[] = [];
            const clusterPositioned: PositionedCalendarShift[] = cluster.map((shift) => {
                const start = this.shiftStartMs(shift);
                let column = columnEnds.findIndex((end) => end <= start);
                if (column < 0) {
                    column = columnEnds.length;
                    columnEnds.push(0);
                }

                columnEnds[column] = this.shiftEndMs(shift);
                return {
                    ...shift,
                    overlapColumn: column,
                    overlapColumns: 1
                };
            });

            const columns = Math.max(1, columnEnds.length);
            clusterPositioned.forEach((shift) => {
                shift.overlapColumns = columns;
                positioned.push(shift);
            });
        }

        return positioned;
    }

    private shiftStartMs(shift: CalendarShift): number {
        return new Date(shift.startDateTime).getTime();
    }

    private shiftEndMs(shift: CalendarShift): number {
        return new Date(shift.endDateTime).getTime();
    }

    private formatTime(value: string | Date): string {
        return new Date(value).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    get filteredShifts(): CalendarShift[] {
        return this.shifts.filter(shift => this.selectedServiceIds.has(shift.serviceId));
    }

    get allServicesSelected(): boolean {
        return this.serviceFilters.length > 0 &&
            this.serviceFilters.every(service => this.selectedServiceIds.has(service.id));
    }

    toggleService(serviceId: number): void {
        if (this.selectedServiceIds.has(serviceId)) {
            this.selectedServiceIds.delete(serviceId);
        } else {
            this.selectedServiceIds.add(serviceId);
        }
        this.selectedServiceIds = new Set(this.selectedServiceIds);
        this.closeHiddenShiftDetails();
    }

    toggleAllServices(): void {
        this.selectedServiceIds = this.allServicesSelected
            ? new Set<number>()
            : new Set(this.serviceFilters.map(service => service.id));
        this.closeHiddenShiftDetails();
    }

    isServiceSelected(serviceId: number): boolean {
        return this.selectedServiceIds.has(serviceId);
    }

    selectShift(shift: CalendarShift): void {
        this.selectedShift = shift;
        this.editStart = this.toDateTimeLocal(shift.startDateTime);
        this.editEnd = this.toDateTimeLocal(shift.endDateTime);
    }

    closeShiftDetails(): void {
        this.selectedShift = null;
    }

    async saveShiftChanges(): Promise<void> {
        const shift = this.selectedShift;
        if (!this.canManageShiftActions || !shift?.idShift) return;
        const start = new Date(this.editStart);
        const end = new Date(this.editEnd);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
            this.snackBar.open('L\'orario di inizio deve essere precedente alla fine', 'Chiudi', { duration: 3000 });
            return;
        }

        this.processingShiftId = shift.idShift;
        try {
            const saved = await this.scheduleService.putShift({
                idShift: shift.idShift,
                idUser: shift.idUser,
                idEmployee: shift.idEmployee,
                startDateTime: start.toISOString(),
                endDateTime: end.toISOString()
            });
            if (!saved) {
                this.snackBar.open('Impossibile modificare il turno', 'Chiudi', { duration: 3000 });
                return;
            }
            this.snackBar.open('Turno aggiornato correttamente', 'Ok', { duration: 2500 });
            await this.loadShifts();
        } catch {
            this.snackBar.open('Impossibile modificare il turno', 'Chiudi', { duration: 3000 });
        } finally {
            this.processingShiftId = null;
            this.cdr.detectChanges();
        }
    }

    async deleteSelectedShift(): Promise<void> {
        const shift = this.selectedShift;
        if (!this.canManageShiftActions || !shift?.idShift) return;
        if (!window.confirm('Confermi l\'eliminazione del turno selezionato?')) return;

        this.processingShiftId = shift.idShift;
        try {
            const response = await this.scheduleService.deleteShift(shift.idShift);
            const message = Array.isArray(response) && response.length ? response[0] : 'Turno eliminato';
            this.snackBar.open(message, 'Ok', { duration: 2500 });
            this.selectedShift = null;
            await this.loadShifts();
        } catch {
            this.snackBar.open('Impossibile eliminare il turno', 'Chiudi', { duration: 3000 });
        } finally {
            this.processingShiftId = null;
            this.cdr.detectChanges();
        }
    }

    isShiftBusy(shift: CalendarShift): boolean {
        return !!shift.idShift && this.processingShiftId === shift.idShift;
    }

    prevPeriod(): void {
        const d = new Date(this.selectedDate);
        if (this.viewMode === 'day') d.setDate(d.getDate() - 1);
        else if (this.viewMode === 'week') d.setDate(d.getDate() - 7);
        else d.setMonth(d.getMonth() - 1);
        this.selectedDate = d; void this.loadShifts();
    }

    nextPeriod(): void {
        const d = new Date(this.selectedDate);
        if (this.viewMode === 'day') d.setDate(d.getDate() + 1);
        else if (this.viewMode === 'week') d.setDate(d.getDate() + 7);
        else d.setMonth(d.getMonth() + 1);
        this.selectedDate = d; void this.loadShifts();
    }

    formatDay(d: Date): string { return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }); }
    isToday(d: Date): boolean { return d.toDateString() === new Date().toDateString(); }
    goToToday(): void { this.selectedDate = new Date(); void this.loadShifts(); }

    private toDateTimeLocal(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    }

    private initializeSelectedServices(): void {
        const availableIds = this.serviceFilters.map(service => service.id);
        const preservedSelection = Array.from(this.selectedServiceIds)
            .filter(id => availableIds.includes(id));
        if (preservedSelection.length > 0) {
            this.selectedServiceIds = new Set(preservedSelection);
            return;
        }

        const preferredServiceId = this.authenticationService.getSelectedServiceId();
        this.selectedServiceIds = preferredServiceId && availableIds.includes(preferredServiceId)
            ? new Set([preferredServiceId])
            : new Set(availableIds);
    }

    private closeHiddenShiftDetails(): void {
        if (this.selectedShift && !this.selectedServiceIds.has(this.selectedShift.serviceId)) {
            this.closeShiftDetails();
        }
    }
}
