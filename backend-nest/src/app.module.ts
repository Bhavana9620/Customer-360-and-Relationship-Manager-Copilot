import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { InfrastructureModule } from './core/infrastructure/infrastructure.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { AiModule } from './modules/ai/ai.module';
import { CopilotModule } from './modules/copilot/copilot.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { HealthModule } from './modules/health/health.module';
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envValidationSchema,
    }),
    InfrastructureModule,
    AuthModule,
    CustomersModule,
    ServiceRequestsModule,
    CopilotModule,
    AuditModule,
    AiModule,
    ConversationsModule,
    HealthModule,
  ],
})
export class AppModule {}
