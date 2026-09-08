import { Controller, Get } from '@nestjs/common';

@Controller('audit')
export class AuditController {
  @Get()
  findAll() {
    return {
      message: 'Audit module is ready.',
      items: [],
    };
  }
}
