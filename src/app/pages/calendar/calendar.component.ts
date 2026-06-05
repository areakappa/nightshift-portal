import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ShiftItemDTO } from '../../models/dto/ShiftItemDTO';
import { ShiftsSearch } from '../../models/generic/Shift/ShiftsSearch';
import { ScheduleService } from '../../services/schedule.service';

@Component({
    selector: 'app-calendar',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatChipsModule, MatSnackBarModule
    ],
    templateUrl: './calendar.component.html',
    styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
    shifts: ShiftItemDTO[] = [];
    isLoading = false;
    selectedDate = new Date();
    viewMode: 'day' | 'week' | 'month' = 'week';

    constructor(
        private scheduleService: ScheduleService,
        private snackBar: MatSnackBar
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadShifts();
    }

    async loadShifts(): Promise<void> {
        this.isLoading = true;
        try {
            const { start, end } = this.getDateRange();
            const search = new ShiftsSearch(
                null,
                this.scheduleService.getStringFromDate(start),
                this.scheduleService.getStringFromDate(end)
            );
            this.shifts = await this.scheduleService.getShiftsByService(search);
        } catch {
            this.snackBar.open('Errore nel caricamento turni', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
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

    getShiftsForDate(date: Date): ShiftItemDTO[] {
        const dateStr = date.toISOString().split('T')[0];
        return this.shifts.filter(s => s.startDateTime?.startsWith(dateStr));
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
}
