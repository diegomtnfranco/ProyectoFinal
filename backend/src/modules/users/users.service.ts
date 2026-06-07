// import { Injectable } from '@nestjs/common';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';

// @Injectable()
// export class UsersService {
//   create(createUserDto: CreateUserDto) {
//     return 'This action adds a new user';
//   }

//   findAll() {
//     return `This action returns all users`;
//   }

//   findOne(id: number) {
//     return `This action returns a #${id} user`;
//   }

//   update(id: number, updateUserDto: UpdateUserDto) {
//     return `This action updates a #${id} user`;
//   }

//   remove(id: number) {
//     return `This action removes a #${id} user`;
//   }
// }
import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
private readonly logger = new Logger('UsersService');

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const user = this.usersRepository.create({
        ...createUserDto,
        passwordHash: hashedPassword,
      });
      await this.usersRepository.save(user);
      return user
    } catch (error: Error | any) {
      this.handleDBExceptions(error);
    }

  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.preload({id, ...updateUserDto});
    
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    try {
      await this.usersRepository.save(user);
      return this.findOne(id);
      
    } catch (error) {
      this.handleDBExceptions(error);
    }
    
  }

  async remove(id: string): Promise<void> {
    const userToDelete = await this.findOne(id);
    if (!userToDelete) throw new NotFoundException(`User with ID ${id} not found`);
    await this.usersRepository.remove(userToDelete);
  }

  private handleDBExceptions(error: Error | any): never {
    this.logger.error('Database error', error);
    throw new InternalServerErrorException('Database error: ' + error.message);
  }

  async activateUser(id: string) {
  const user = await this.usersRepository.findOne({
    where: { id },
  })

  if (!user) {
    throw new NotFoundException(
      'Usuario no encontrado'
    )
  }

  user.isActive = true

  return await this.usersRepository.save(user)
}

async deactivateUser(id: string) {
  const user = await this.usersRepository.findOne({
    where: { id },
  })

  if (!user) {
    throw new NotFoundException(
      'Usuario no encontrado'
    )
  }

  user.isActive = false

  return await this.usersRepository.save(user)
}

}
