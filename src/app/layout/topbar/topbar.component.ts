import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { RouterModule } from '@angular/router';
import { RoleService, UserRole } from '../../services/role.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [CommonModule, RouterModule, MatToolbarModule, MatIconModule, MatButtonModule, MatBadgeModule],
    templateUrl: './topbar.component.html',
    styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent {
    @Input() title = 'NightShift Portal';
    @Output() menuToggle = new EventEmitter<void>();

    currentRole$: Observable<UserRole>;

    constructor(private roleService: RoleService) {
        this.currentRole$ = this.roleService.getRole$();
    }
}
