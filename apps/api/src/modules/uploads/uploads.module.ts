import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { UploadsService } from './application/uploads.service';
import { UploadsController } from './presentation/uploads.controller';

@Module({
  imports: [ReportsModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
