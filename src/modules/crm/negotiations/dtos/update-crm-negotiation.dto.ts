import { PartialType } from '@nestjs/swagger';
import { CreateCrmNegotiationDto } from './create-crm-negotiation.dto';

export class UpdateCrmNegotiationDto extends PartialType(
  CreateCrmNegotiationDto,
) {}
