import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ServiceDTO } from '../../models/dto/serviceDTO';
import { ServiceShiftDto } from '../../models/dto/ServiceShiftDto';
import { mShiftType } from '../../models/dto/mShiftType';
import { ServiceShiftCrud } from '../../models/crud/ServiceShiftCrud';
import { ServicesService } from '../../services/services.service';

@Component({
    selector: 'app-service-shifts',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule,
        MatCardModule, MatButtonModule, MatIconModule,
        MatProgressSpinnerModule, MatFormFieldModule, MatInputModule,
        MatSelectModule, MatSnackBarModule, MatTableModule
    ],
    templateUrl: './service-shifts.component.html',
    styleUrls: ['./service-shifts.component.scss']
})
export class ServiceShiftsComponent implements OnInit {
    service: ServiceDTO | null = null;
    shifts: ServiceShiftDto[] = [];
    shiftTypes: mShiftType[] = [];
    isLoading = false;
    showAddForm = false;
    savingShift = false;

    shiftName = new FormControl('', [Validators.required]);
    shiftStart = new FormControl('', [Validators.required]);
    shiftEnd = new FormControl('', [Validators.required]);

    displayedColumns = ['name', 'start', 'end', 'actions'];

    constructor(
        private servicesService: ServicesService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        const state = history.state;
        if (state?.service) {
            try { this.service = JSON.parse(state.service); } catch { }
        }
    }

    async ngOnInit(): Promise<void> {
        await this.loadShifts();
    }

    async loadShifts(): Promise<void> {
        if (!this.service?.id) return;
        this.isLoading = true;
        try {
            const svc = await this.servicesService.getServicebyID(this.service.id);
            this.shifts = svc?.serviceShifts ?? [];
        } catch (e) {
            this.snackBar.open('Errore nel caricamento turni', 'Chiudi', { duration: 3000 });
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    async addShift(): Promise<void> {
        if (this.shiftName.invalid || this.shiftStart.invalid || this.shiftEnd.invalid || !this.service?.id) return;
        this.savingShift = true;
        try {
            const crud: ServiceShiftCrud = {
                name: this.shiftName.value!,
                startTime: this.shiftStart.value!,
                endTime: this.shiftEnd.value!,
                idService: this.service.id,
            } as any;
            await this.servicesService.postServiceShifts([crud]);
            this.snackBar.open('Turno aggiunto', 'Ok', { duration: 2000 });
            this.shiftName.reset(); this.shiftStart.reset(); this.shiftEnd.reset();
            this.showAddForm = false;
            await this.loadShifts();
        } catch {
            this.snackBar.open('Errore nell\'aggiunta del turno', 'Chiudi', { duration: 3000 });
        } finally {
            this.savingShift = false;
        }
    }

    goBack(): void {
        this.router.navigateByUrl('/service-detail', { state: { service: JSON.stringify(this.service) } });
    }

    formatTime(t: string): string {
        return t ?? '—';
    }
}
