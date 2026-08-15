import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VendorsService } from './vendors.service.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { UpdateVendorDto } from './dto/update-vendor.dto.js';
import { Feature } from '../auth/decorators/feature.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('vendors')
@Feature('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post('import')
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  async importVendors(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Upload an Excel file (field name: file)');
    }
    const originalName = file.originalname.toLowerCase();
    if (!originalName.endsWith('.xlsx') && !originalName.endsWith('.xls')) {
      throw new BadRequestException('Only .xlsx or .xls files are supported');
    }
    return this.vendorsService.importFromExcel(file.buffer);
  }

  @Post()
  create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorsService.create(createVendorDto);
  }

  @Get()
  @Feature()
  findAll() {
    return this.vendorsService.findAll();
  }

  @Get(':id')
  @Feature()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    return this.vendorsService.update(id, updateVendorDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.remove(id);
  }
}
