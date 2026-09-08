import { Controller, Get } from '@nestjs/common';

@Controller('copilot')
export class CopilotController {
  @Get()
  health() {
    return {
      message: 'Copilot module is ready.',
    };
  }
}
