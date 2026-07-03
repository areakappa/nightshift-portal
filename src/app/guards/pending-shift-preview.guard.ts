import { CanDeactivateFn } from '@angular/router';
import { ServiceScheduleComponent } from '../pages/service-schedule/service-schedule.component';

export const pendingShiftPreviewGuard: CanDeactivateFn<ServiceScheduleComponent> = component =>
    component.canLeaveWithGeneratedPreview();
