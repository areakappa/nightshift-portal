import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GenerateShiftsRequest } from '../../models/generic/Shift/GenerateShiftsRequest';
import { ShiftsSearch } from '../../models/generic/Shift/ShiftsSearch';
import { ShiftAutomationCrud } from '../../models/dto/ShiftAutomationCrud';
import { ShiftItemDTO } from '../../models/dto/ShiftItemDTO';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { ScheduleService } from '../../services/schedule.service';

type GenerationMode = 'manual' | 'auto';
type Period = 'weekly' | 'monthly';
type GenerationPeriodSelection =
    | 'automatic'
    | 'current_week'
    | 'next_week'
    | 'current_month'
    | 'next_month'
    | 'custom';
type MonthlyRuleType = 'last_weekday' | 'last_day' | 'nth_weekday';
type ShiftGenerationStatus = 'success' | 'warning' | 'error';

interface ShiftGenerationItemReport {
    index: number;
    date: string;
    startTime: string;
    endTime: string;
    role: string;
    assignee: string;
    status: ShiftGenerationStatus;
    message: string;
}

interface ShiftGenerationReport {
    total: number;
    success: number;
    warnings: number;
    errors: number;
    inconsistencies: number;
    completionRate: number;
    finalStatusLabel: string;
    items: ShiftGenerationItemReport[];
    globalMessage: string;
    periodLabel?: string;
}

@Component({
    selector: 'app-service-schedule',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatSnackBarModule
    ],
    templateUrl: './service-schedule.component.html',
    styleUrls: ['./service-schedule.component.scss']
})
export class ServiceScheduleComponent implements OnInit {
    service: ServiceDTO | null = null;
    mode: GenerationMode = 'manual';
    period: Period = 'weekly';
    generationPeriodSelection: GenerationPeriodSelection = 'automatic';
    customStartDate = '';
    customEndDate = '';
    hasActiveShiftAutomation = false;
    isLoadingAutomation = false;
    isSaving = false;
    isGenerating = false;
    generationReport: ShiftGenerationReport | null = null;

    autoWeekly = { runAtWeekday: 5, runAtTime: '18:00' };
    autoMonthly = { runAtTime: '18:00' };
    monthlyRuleType: MonthlyRuleType = 'last_weekday';
    monthlyLastWeekday = 5;
    monthlyNth = 1;
    monthlyNthWeekday = 1;
    weekdays = [
        { value: 1, label: 'Lunedì' },
        { value: 2, label: 'Martedì' },
        { value: 3, label: 'Mercoledì' },
        { value: 4, label: 'Giovedì' },
        { value: 5, label: 'Venerdì' },
        { value: 6, label: 'Sabato' },
        { value: 7, label: 'Domenica' }
    ];

    private automationId?: number;

    constructor(
        private scheduleService: ScheduleService,
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
        await this.loadShiftAutomation();
    }

    get summaryText(): string {
        if (this.period === 'weekly') {
            return `Automatica · Settimanale · Ogni ${this.weekdayLabel(this.autoWeekly.runAtWeekday)} alle ${this.autoWeekly.runAtTime}`;
        }
        return `Automatica · Mensile · ${this.describeMonthlyRule()} alle ${this.autoMonthly.runAtTime}`;
    }

    onModeChanged(mode: GenerationMode): void {
        this.mode = mode;
    }

    onPeriodChanged(period: Period): void {
        this.period = period;
    }

    async save(): Promise<void> {
        if (!this.service?.id || this.isSaving) {
            this.showMessage('Servizio non trovato: impossibile salvare');
            return;
        }

        this.isSaving = true;
        try {
            const payload = this.buildAutomationPayload();
            const result = await this.scheduleService.postShiftAutomation(payload);
            this.automationId = this.extractAutomationId(result) ?? this.automationId;
            this.hasActiveShiftAutomation = true;
            this.showMessage('Impostazioni salvate');
        } catch {
            this.showMessage('Errore nel salvataggio impostazioni');
        } finally {
            this.isSaving = false;
            this.cdr.detectChanges();
        }
    }

    async generateNow(): Promise<void> {
        if (this.isGenerating) return;
        if (!this.service?.id) {
            this.showMessage('Servizio non trovato: impossibile generare i turni');
            return;
        }

        const validationError = this.validateGenerationRequest();
        if (validationError) {
            this.showMessage(validationError);
            return;
        }

        this.isGenerating = true;
        this.generationReport = null;
        try {
            const weeklyRange = this.resolveWeeklyRangeToProcess();
            let request = this.buildGenerateShiftsRequest();

            if (weeklyRange) {
                const existingShifts = await this.getExistingShiftsForRange(weeklyRange.start, weeklyRange.end);
                if (existingShifts.length > 0) {
                    const confirmed = window.confirm(
                        'Sei sicuro di voler sovrascrivere i turni già esistenti per la settimana selezionata? ' +
                        'Saranno inviate le notifiche di rettifica di tutti i turni.'
                    );
                    if (!confirmed) return;

                    request = this.buildRegenerationRequestFromTomorrow(request, weeklyRange.start, weeklyRange.end);
                    await this.deleteExistingShifts(existingShifts, weeklyRange.start);
                }
            }

            const prompt = await this.scheduleService.generatePrompt(request);;
            const response = await this.scheduleService.generateShifts(request);
            this.generationReport = this.buildGenerationReport(response);
            this.showMessage(this.generationReport.globalMessage);
        } catch (error) {
            const backendMessage = this.extractGenerationErrorMessage(error);
            this.showMessage(
                backendMessage?.includes('Il servizio non ha un\'automazione configurata')
                    ? 'Il servizio non ha un\'automazione configurata. Specificare il periodo o date personalizzate.'
                    : 'Errore durante la generazione dei turni'
            );
        } finally {
            this.isGenerating = false;
            this.cdr.detectChanges();
        }
    }

    getGenerationReportStatusLabel(status: ShiftGenerationStatus): string {
        if (status === 'success') return 'Completato';
        if (status === 'warning') return 'Attenzione';
        return 'Errore';
    }

    getGenerationFinalStatusTone(report: ShiftGenerationReport): ShiftGenerationStatus {
        if (report.errors > 0) return 'error';
        if (report.inconsistencies > 0) return 'warning';
        return 'success';
    }

    goBack(): void {
        this.router.navigateByUrl('/service-detail', { state: { service: JSON.stringify(this.service) } });
    }

    private async loadShiftAutomation(): Promise<void> {
        if (!this.service?.id) return;
        this.isLoadingAutomation = true;
        try {
            const automation = await this.scheduleService.getShiftAutomationByService(this.service.id);
            this.hasActiveShiftAutomation = !!automation && automation.state === 1;
            if (!automation) {
                this.ensureGenerationSelectionIsValid();
                return;
            }
            this.automationId = automation.id;
            this.applyAutomationToViewModel(automation);
        } catch {
            this.hasActiveShiftAutomation = false;
            this.ensureGenerationSelectionIsValid();
        } finally {
            this.isLoadingAutomation = false;
            this.cdr.detectChanges();
        }
    }

    private applyAutomationToViewModel(automation: ShiftAutomationCrud): void {
        this.mode = automation.idautomationType === 2 ? 'auto' : 'manual';
        this.period = automation.automationInterval === 2 ? 'monthly' : 'weekly';
        const runAtTime = this.toTimeString(automation.generationHour);

        if (this.period === 'weekly') {
            this.autoWeekly = { runAtWeekday: this.normalizeWeekday(automation.generationDay), runAtTime };
            return;
        }

        this.autoMonthly.runAtTime = runAtTime;
        if (automation.generationDay >= 1 && automation.generationDay <= 7) {
            this.monthlyRuleType = 'last_weekday';
            this.monthlyLastWeekday = this.normalizeWeekday(automation.generationDay);
        } else {
            this.monthlyRuleType = 'last_day';
        }
    }

    private buildAutomationPayload(): ShiftAutomationCrud {
        const runTime = this.period === 'weekly' ? this.autoWeekly.runAtTime : this.autoMonthly.runAtTime;
        return {
            id: this.automationId,
            idautomationType: this.mode === 'auto' ? 2 : 1,
            automationInterval: this.period === 'monthly' ? 2 : 1,
            startDay: 1,
            endDay: this.period === 'monthly' ? 31 : 7,
            generationDay: this.getGenerationDayValue(),
            generationHour: this.toHourValue(runTime),
            idService: this.service?.id,
            state: 1
        };
    }

    private getGenerationDayValue(): number {
        if (this.period === 'weekly') return this.normalizeWeekday(this.autoWeekly.runAtWeekday);
        if (this.monthlyRuleType === 'last_day') return 31;
        return this.normalizeWeekday(
            this.monthlyRuleType === 'nth_weekday' ? this.monthlyNthWeekday : this.monthlyLastWeekday
        );
    }

    private validateGenerationRequest(): string | null {
        if (this.generationPeriodSelection === 'automatic' && !this.hasActiveShiftAutomation) {
            return 'Automatico non disponibile: il servizio non ha una configurazione attiva.';
        }
        if (this.generationPeriodSelection !== 'custom') return null;
        if (!this.customStartDate || !this.customEndDate) {
            return 'Per un periodo personalizzato seleziona data inizio e data fine.';
        }
        const start = new Date(this.customStartDate);
        const end = new Date(this.customEndDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Le date personalizzate non sono valide.';
        if (start > end) return 'La data di inizio deve essere precedente o uguale alla data di fine.';
        return null;
    }

    private buildGenerateShiftsRequest(): GenerateShiftsRequest {
        const custom = this.generationPeriodSelection === 'custom';
        return {
            serviceId: this.service!.id,
            periodType: this.getSelectedPeriodType(),
            customStartDate: custom ? this.toIsoDateOnly(this.customStartDate) : undefined,
            customEndDate: custom ? this.toIsoDateOnly(this.customEndDate) : undefined
        };
    }

    private getSelectedPeriodType(): 0 | 1 | 2 | 3 | 4 {
        const types: Record<GenerationPeriodSelection, 0 | 1 | 2 | 3 | 4> = {
            automatic: 0,
            current_week: 1,
            next_week: 2,
            current_month: 3,
            next_month: 4,
            custom: 1
        };
        return types[this.generationPeriodSelection];
    }

    private resolveWeeklyRangeToProcess(): { start: Date; end: Date } | null {
        if (this.generationPeriodSelection === 'current_week') return this.getWeekRangeFromToday(0);
        if (this.generationPeriodSelection === 'next_week') return this.getWeekRangeFromToday(1);
        if (this.generationPeriodSelection === 'automatic' && this.period === 'weekly') {
            return this.getWeekRangeFromToday(0);
        }
        return null;
    }

    private getWeekRangeFromToday(weekOffset: number): { start: Date; end: Date } {
        const now = new Date();
        const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(now.getDate() + mondayOffset + weekOffset * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    private async getExistingShiftsForRange(start: Date, end: Date): Promise<ShiftItemDTO[]> {
        return this.scheduleService.getShiftsByService(
            new ShiftsSearch(
                this.service!.id,
                this.scheduleService.getStringFromDate(start),
                this.scheduleService.getStringFromDate(end)
            )
        );
    }

    private async deleteExistingShifts(shifts: ShiftItemDTO[], rangeStart: Date): Promise<void> {
        const tomorrow = this.getStartOfTomorrow();
        const shiftsToDelete = this.isCurrentWeekRange(rangeStart)
            ? shifts.filter(shift => {
                const start = new Date(shift.startDateTime);
                return !isNaN(start.getTime()) && start >= tomorrow;
            })
            : shifts;
        for (const shift of shiftsToDelete) {
            if (shift.idShift && shift.idShift > 0) await this.scheduleService.deleteShift(shift.idShift);
        }
    }

    private buildRegenerationRequestFromTomorrow(
        baseRequest: GenerateShiftsRequest,
        periodStart: Date,
        weekEnd: Date
    ): GenerateShiftsRequest {
        const tomorrow = this.getStartOfTomorrow();
        const start = tomorrow > periodStart ? tomorrow : periodStart;
        const safeEnd = start > weekEnd ? start : weekEnd;
        return {
            ...baseRequest,
            customStartDate: this.toIsoDateOnly(start.toISOString()),
            customEndDate: this.toIsoDateOnly(safeEnd.toISOString())
        };
    }

    private buildGenerationReport(rawResponse: any): ShiftGenerationReport {
        const rawItems = this.extractShiftItems(rawResponse);
        const items = rawItems.map((rawItem, index) => this.buildReportItem(rawItem, index));
        const backendCount = Number(rawResponse?.shiftsGenerated);
        const hasBackendCount = Number.isFinite(backendCount) && backendCount >= 0;
        const total = items.length || (hasBackendCount ? backendCount : 0);
        const success = items.length
            ? items.filter(item => item.status === 'success').length
            : rawResponse?.success === false ? 0 : total;
        const warnings = items.filter(item => item.status === 'warning').length;
        const errors = items.length
            ? items.filter(item => item.status === 'error').length
            : rawResponse?.success === false ? Math.max(total, 1) : 0;
        const inconsistencies = warnings + errors;
        const completionRate = total > 0 ? Math.round((success / total) * 100) : 0;
        const backendMessage = typeof rawResponse?.message === 'string' ? rawResponse.message.trim() : '';
        const periodLabel = this.buildPeriodLabel(rawResponse);
        let finalStatusLabel = 'Nessun turno prodotto nel periodo';
        if (total > 0 && inconsistencies === 0) finalStatusLabel = 'Tutti i turni risultano completati';
        else if (errors > 0) finalStatusLabel = 'Presenti incongruenze bloccanti';
        else if (warnings > 0) finalStatusLabel = 'Presenti incongruenze da verificare';

        const globalMessage = backendMessage || (
            errors > 0
                ? `Generazione completata con criticità: ${success}/${total} turni OK, ${warnings} con attenzione, ${errors} errori.`
                : warnings > 0
                    ? `Generazione completata: ${success}/${total} turni OK, ${warnings} con attenzione.`
                    : total > 0
                        ? `Generazione completata con successo: ${success}/${total} turni OK.`
                        : 'Nessun turno generato per il periodo selezionato.'
        );
        return {
            total,
            success,
            warnings,
            errors,
            inconsistencies,
            completionRate,
            finalStatusLabel,
            items,
            globalMessage,
            periodLabel
        };
    }

    private buildReportItem(rawItem: any, index: number): ShiftGenerationItemReport {
        const status = this.resolveItemStatus(rawItem);
        return {
            index: index + 1,
            date: this.formatDisplayDate(rawItem?.date ?? rawItem?.shiftDate ?? rawItem?.startDateTime),
            startTime: this.formatDisplayTime(rawItem?.startTime ?? rawItem?.from ?? rawItem?.startDateTime),
            endTime: this.formatDisplayTime(rawItem?.endTime ?? rawItem?.to ?? rawItem?.endDateTime),
            role: rawItem?.role ?? rawItem?.roleName ?? rawItem?.nameServiceType ?? '-',
            assignee: rawItem?.nameEmployee ?? rawItem?.employeeName ?? rawItem?.assigneeName ?? 'Non assegnato',
            status,
            message: rawItem?.message ?? rawItem?.note ?? rawItem?.errorMessage ?? this.defaultStatusMessage(status)
        };
    }

    private resolveItemStatus(rawItem: any): ShiftGenerationStatus {
        const text = String(rawItem?.status ?? rawItem?.outcome ?? rawItem?.result ?? '').toLowerCase();
        if (rawItem?.error === true || rawItem?.success === false || text.includes('error') || text.includes('failed')) {
            return 'error';
        }
        const hasAssignee = !!(rawItem?.nameEmployee || rawItem?.employeeName || rawItem?.assigneeName || rawItem?.idUser);
        if (rawItem?.warning === true || text.includes('warn') || text.includes('partial') || !hasAssignee) {
            return 'warning';
        }
        return 'success';
    }

    private defaultStatusMessage(status: ShiftGenerationStatus): string {
        if (status === 'error') return 'Errore durante la generazione di questo turno.';
        if (status === 'warning') return 'Turno generato con copertura incompleta o da verificare.';
        return 'Turno generato correttamente.';
    }

    private extractShiftItems(response: any): any[] {
        if (Array.isArray(response)) return response;
        return response?.items ?? response?.shifts ?? response?.data?.items ?? response?.data?.shifts ?? [];
    }

    private buildPeriodLabel(response: any): string | undefined {
        const start = this.formatDisplayDate(response?.startDate);
        const end = this.formatDisplayDate(response?.endDate);
        return start !== '-' && end !== '-' ? `${start} - ${end}` : undefined;
    }

    private extractGenerationErrorMessage(error: any): string | null {
        if (typeof error === 'string') return error;
        return error?.error?.message ?? error?.error ?? error?.message ?? null;
    }

    private ensureGenerationSelectionIsValid(): void {
        if (!this.hasActiveShiftAutomation && this.generationPeriodSelection === 'automatic') {
            this.generationPeriodSelection = 'current_week';
        }
    }

    private getStartOfTomorrow(): Date {
        const tomorrow = new Date();
        tomorrow.setHours(0, 0, 0, 0);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    }

    private isCurrentWeekRange(rangeStart: Date): boolean {
        const current = this.getWeekRangeFromToday(0).start;
        return rangeStart.getFullYear() === current.getFullYear()
            && rangeStart.getMonth() === current.getMonth()
            && rangeStart.getDate() === current.getDate();
    }

    private describeMonthlyRule(): string {
        if (this.monthlyRuleType === 'last_day') return 'Ultimo giorno del mese precedente';
        const weekday = this.weekdayLabel(
            this.monthlyRuleType === 'nth_weekday' ? this.monthlyNthWeekday : this.monthlyLastWeekday
        );
        return this.monthlyRuleType === 'nth_weekday'
            ? `${this.monthlyNth}° ${weekday} del mese precedente`
            : `Ultimo ${weekday} del mese precedente`;
    }

    private weekdayLabel(day: number): string {
        return this.weekdays.find(weekday => weekday.value === day)?.label ?? 'giorno';
    }

    private normalizeWeekday(day: number): number {
        return isNaN(day) ? 5 : Math.min(Math.max(day, 1), 7);
    }

    private toHourValue(value: string): number {
        const [hours, minutes] = value.split(':').map(Number);
        const now = new Date();
        return new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            Number.isFinite(hours) ? hours : 18,
            Number.isFinite(minutes) ? minutes : 0
        ).getUTCHours();
    }

    private toTimeString(hour: number): string {
        const now = new Date();
        const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour || 0));
        return `${String(date.getHours()).padStart(2, '0')}:00`;
    }

    private toIsoDateOnly(value: string): string {
        return value.includes('T') ? value.split('T')[0] : value;
    }

    private formatDisplayDate(value: any): string {
        if (!value) return '-';
        const date = new Date(value);
        return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('it-IT');
    }

    private formatDisplayTime(value: any): string {
        if (!value) return '-';
        const match = typeof value === 'string' ? value.match(/(\d{1,2}):(\d{2})/) : null;
        if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
        const date = new Date(value);
        return isNaN(date.getTime())
            ? String(value)
            : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    private extractAutomationId(result: any): number | undefined {
        const id = Number(result?.id ?? result);
        return Number.isFinite(id) && id > 0 ? id : undefined;
    }

    private showMessage(message: string): void {
        this.snackBar.open(message, 'Chiudi', { duration: 3500 });
    }
}
