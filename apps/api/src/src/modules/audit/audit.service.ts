import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditService {
  async findAll() {
    return { items: [] };
  }
}
