import { PartialType } from '@nestjs/mapped-types';
import { CreateThresholdDto } from './create-threshold.dto';

export class UpdateThresholdDto extends PartialType(CreateThresholdDto) {}
