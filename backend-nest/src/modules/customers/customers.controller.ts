import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { KeycloakGuard } from '../auth/keycloak.guard';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(KeycloakGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  search(@Query('q') query = '') {
    return this.customersService.search(query);
  }
}
