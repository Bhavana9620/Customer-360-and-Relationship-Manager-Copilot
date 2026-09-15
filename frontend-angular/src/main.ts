
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { KeycloakService } from './core/keycloak.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideRouter(routes),
    KeycloakService
  ]
})
.then(async (appRef) => {
  const keycloakService = appRef.injector.get(KeycloakService);

  try {
    await keycloakService.init();
  } catch (error) {
    console.error('Keycloak initialization failed:', error);
  }
})
.catch((error: unknown) => {
  console.error('Angular bootstrap failed:', error);
});

