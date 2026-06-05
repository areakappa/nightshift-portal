import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { OrganizationService } from './services/organization.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class App implements OnInit {
  constructor(
    private themeService: ThemeService,
    private organizationService: OrganizationService
  ) { }

  async ngOnInit(): Promise<void> {
    this.themeService.init();
    await this.organizationService.init();
  }
}
