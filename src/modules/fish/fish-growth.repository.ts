import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOneOptions } from 'typeorm';
import { FishGrowth } from './entities/fish-growth.entity';
import { CreateFishGrowthDto } from './dto/create-fish-growth.dto';

@Injectable()
export class FishGrowthRepository {
  constructor(
    @InjectRepository(FishGrowth)
    private readonly fishGrowthRepository: Repository<FishGrowth>,
  ) {}

  create(createFishGrowthDto: CreateFishGrowthDto): FishGrowth {
    return this.fishGrowthRepository.create(createFishGrowthDto);
  }

  save(fishGrowth: FishGrowth): Promise<FishGrowth> {
    return this.fishGrowthRepository.save(fishGrowth);
  }

  findAll(options: FindManyOptions<FishGrowth>): Promise<FishGrowth[]> {
    return this.fishGrowthRepository.find(options);
  }

  findOne(options: FindOneOptions<FishGrowth>): Promise<FishGrowth | null> {
    return this.fishGrowthRepository.findOne(options);
  }

  async remove(id: string): Promise<void> {
    await this.fishGrowthRepository.delete(id);
  }
}