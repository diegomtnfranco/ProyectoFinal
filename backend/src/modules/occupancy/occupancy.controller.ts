import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OccupancyService } from './occupancy.service';
import { CreateOccupancyDto } from './dto/create-occupancy.dto';
import { UpdateOccupancyDto } from './dto/update-occupancy.dto';

@Controller('occupancy')
export class OccupancyController {
  constructor(private readonly occupancyService: OccupancyService) {}

  @Post()
  create(@Body() createOccupancyDto: CreateOccupancyDto) {
    return this.occupancyService.create(createOccupancyDto);
  }

  @Get()
  findAll() {
    return this.occupancyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.occupancyService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOccupancyDto: UpdateOccupancyDto) {
    return this.occupancyService.update(+id, updateOccupancyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.occupancyService.remove(+id);
  }
}
