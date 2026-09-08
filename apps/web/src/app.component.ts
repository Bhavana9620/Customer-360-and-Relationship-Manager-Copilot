import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './core/auth.service';
import { LoginComponent } from './login.component';

@Component({
  selector: 'c360-root',
  standalone: true,
  imports: [NgIf, RouterLink, RouterOutlet, MatButtonModule, LoginComponent],
  template: `
    <ng-container *ngIf="authenticated; else login">
      <div class="app-shell">
        <aside class="rail">
          <a class="brand" routerLink="/dashboard">Ledger <span>360</span></a>
          <p class="rail-kicker">RELATIONSHIP<br>OPERATIONS</p>
          <nav>
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-item"><span>⌂</span>Overview</a>
            <a routerLink="/customers" routerLinkActive="active" class="nav-item"><span>⌕</span>Customers</a>
            <a routerLink="/requests" routerLinkActive="active" class="nav-item"><span>↗</span>Service queue</a>
            <a routerLink="/copilot" routerLinkActive="active" class="nav-item"><span>◌</span>Copilot</a>
          </nav>
          <div class="rail-foot"><div class="avatar">RM</div><div><strong>Rohan Mehta</strong><small>Relationship Manager</small></div></div>
        </aside>
        <main class="content"><header class="topbar"><div><span class="top-kicker">HYDERABAD CLUSTER / LIVE BOOK</span><strong>Customer workspace</strong></div><button mat-stroked-button class="logout" (click)="logout()">Logout</button></header><div class="page-content"><router-outlet></router-outlet></div></main>
      </div>
    </ng-container>
    <ng-template #login><app-login (loggedIn)="onLogin()"></app-login></ng-template>
  `
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  authenticated = this.auth.isAuthenticated();
  onLogin(): void { this.authenticated = true; this.router.navigateByUrl('/dashboard'); }
  logout(): void { this.auth.logout(); this.authenticated = false; this.router.navigateByUrl('/'); }
}
