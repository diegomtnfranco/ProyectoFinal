import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {

    private users = [
    {
      id: 1,
      email: 'admin@prueba.com',
      password: '123456',
      role: 'admin',
    },
    {
      id: 2,
      email: 'client@prueba.com',
      password: '1234',
      role: 'client',
    },
  ];

  findByEmail(email: string) {
    return this.users.find((u) => u.email === email);
  }
}
