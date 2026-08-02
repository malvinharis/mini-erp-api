import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../shared';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { ChangeInvoiceStatusDto } from './dto/change-invoice-status.dto';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { CreateInvoiceDto } from './dto/create-invoice.dto';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { InvoiceQueryDto } from './dto/invoice-query.dto';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { InvoicesService } from './invoices.service';

// Thin controller. Read is open to any authenticated user (incl. VIEWER);
// create/update/status are ADMIN/STAFF (VIEWER read-only). Cancelling is further
// restricted to ADMIN inside the service.
@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  list(@Query() query: InvoiceQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Post()
  @Roles('ADMIN', 'STAFF')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvoiceDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'STAFF')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'STAFF')
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeInvoiceStatusDto,
  ) {
    return this.service.changeStatus(user, id, dto.status);
  }
}
