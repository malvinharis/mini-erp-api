import { createZodDto } from 'nestjs-zod';
import { updateUserSchema } from '../../../shared';

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
