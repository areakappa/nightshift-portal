import { Component, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
    selector: 'app-shell',
    standalone: true,
    imports: [CommonModule, RouterOutlet, MatSidenavModule, SidenavComponent, TopbarComponent],
    templateUrl: './shell.component.html',
    styleUrls: ['./shell.component.scss']
})
export class ShellComponent implements OnInit {
    @ViewChild('sidenav') sidenav!: MatSidenav;
    isMobile = false;
    sidenavMode: 'over' | 'side' = 'side';

    constructor(private breakpointObserver: BreakpointObserver) { }

    ngOnInit(): void {
        this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.Tablet]).subscribe(result => {
            this.isMobile = result.matches;
            this.sidenavMode = result.matches ? 'over' : 'side';
            if (!result.matches && this.sidenav) {
                this.sidenav.open();
            }
        });
    }

    toggleSidenav(): void {
        this.sidenav?.toggle();
    }
}
