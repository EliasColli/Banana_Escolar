import { Module } from '@nestjs/common';
import { CategoriesService } from './application/categories.service';
import { CategoriesController } from './presentation/categories.controller';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
