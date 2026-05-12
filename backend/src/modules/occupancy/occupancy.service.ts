import { Injectable } from '@nestjs/common';
import { CreateOccupancyDto } from './dto/create-occupancy.dto';
import { UpdateOccupancyDto } from './dto/update-occupancy.dto';

@Injectable()
export class OccupancyService {
  create(createOccupancyDto: CreateOccupancyDto) {
    return 'This action adds a new occupancy';
  }

  findAll() {
    return `This action returns all occupancy`;
  }

  findOne(id: number) {
    return `This action returns a #${id} occupancy`;
  }

  update(id: number, updateOccupancyDto: UpdateOccupancyDto) {
    return `This action updates a #${id} occupancy`;
  }

  remove(id: number) {
    return `This action removes a #${id} occupancy`;
  }
}
