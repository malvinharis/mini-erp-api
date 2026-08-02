import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { AuthUser } from '../../shared';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { CustomersService } from './customers.service';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { CreateCustomerDto } from './dto/create-customer.dto';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { UpdateCustomerDto } from './dto/update-customer.dto';

// Thin controller. Read is open to any authenticated user (incl. VIEWER);
// mutations are ADMIN/STAFF only — VIEWER is read-only (RolesGuard enforces it,
// the frontend just hides the buttons).
@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Post()
  @Roles('ADMIN', 'STAFF')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'STAFF')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'STAFF')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
