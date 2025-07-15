import { PartialType } from '@nestjs/swagger';
import { CreateFishGrowthDto } from './create-fish-growth.dto';

export class UpdateFishGrowthDto extends PartialType(CreateFishGrowthDto) {}