import { Module } from '@nestjs/common';
import { KeycloakGuard } from './keycloak.guard';

@Module({
  providers: [KeycloakGuard],
  exports: [KeycloakGuard],
})
export class AuthModule {}
