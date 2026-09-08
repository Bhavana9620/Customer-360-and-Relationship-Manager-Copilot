import { Injectable } from '@nestjs/common';
import { CustomerRepository } from './repositories/customer.repository';

@Injectable()
export class CustomersService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async search(query: string) {
    return this.customerRepository.search(query);
  }
}
