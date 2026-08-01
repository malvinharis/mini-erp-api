import { createZodDto } from 'nestjs-zod';
import { createUserSchema } from '../../../shared';

export class CreateUserDto extends createZodDto(createUserSchema) {}
