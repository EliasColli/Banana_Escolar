import { Module } from '@nestjs/common';
import { AuthService } from './application/auth.service';
import { AuthController } from './presentation/auth.controller';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
