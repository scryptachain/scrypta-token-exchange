import { Module } from '@nestjs/common';
import { LyraController } from './lyra.controller';
import { LyraService } from './lyra.service';

@Module({
  controllers: [LyraController],
  providers: [LyraService],
})
export class LyraModule {}