import { Module } from '@nestjs/common';
import { LyraController } from './lyra.controller';
import { LyraService } from './lyra.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TradeSchema } from '../../schemas/trades.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Trade', schema: TradeSchema }])],
  controllers: [LyraController],
  providers: [LyraService],
})
export class LyraModule {}