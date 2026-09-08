import { Controller, Get } from '@nestjs/common';

@Controller('service-requests')
export class ServiceRequestsController {
  @Get()
  findAll() {
    return {
      message: 'Service requests module is ready.',
      items: [],
    };
  }
}
