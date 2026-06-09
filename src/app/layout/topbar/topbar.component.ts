import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { AccountContext, AccountContextService } from '../../services/account-context.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [CommonModule, RouterModule, MatToolbarModule, MatIconModule, MatButtonModule],
    templateUrl: './topbar.component.html',
    styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit {
    @Input() title = 'NightShiftAI Portal';
    @Output() menuToggle = new EventEmitter<void>();

    accountContext$: Observable<AccountContext>;

    constructor(private accountContextService: AccountContextService) {
        this.accountContext$ = this.accountContextService.context$;
    }

    ngOnInit(): void {
        void this.accountContextService.refresh();
    }
}
