import { Injectable } from '@nestjs/common';

@Injectable()
export class ServiceRequestsService {
  async findAll() {
    return { items: [] };
  }
}
