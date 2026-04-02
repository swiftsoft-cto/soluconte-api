import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Body,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { Rule } from 'src/common/decorators/rule.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';

@UseGuards(JwtAuthGuard, RulesGuard)
@Controller('api/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Rule('services.findAll')
  @Get('/')
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.servicesService.findAllPaginated(page, limit);
  }

  @Rule('services.findOne')
  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Rule('services.create', 'team')
  @Post('/')
  create(@Body() createDto: any) {
    return this.servicesService.create(createDto);
  }

  @Rule('services.update', 'team')
  @Patch('/:id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.servicesService.update(id, updateDto);
  }

  @Rule('services.remove', 'team')
  @Delete('/:id')
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}
