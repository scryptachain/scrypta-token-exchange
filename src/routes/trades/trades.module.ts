import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TradeController } from './trades.controller';
import { TradeService } from './trades.service';
import { TradeSchema } from '../../schemas/trades.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Trade', schema: TradeSchema }])],
  controllers: [TradeController],
  providers: [TradeService],
})
export class TradesModule {}