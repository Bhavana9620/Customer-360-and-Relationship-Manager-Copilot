import { Injectable } from '@nestjs/common';

@Injectable()
export class CopilotService {
  async getSummary() {
    return {
      summary: 'Copilot service initialized.',
    };
  }
}
