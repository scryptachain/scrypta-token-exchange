import { Module } from '@nestjs/common';
import { TradeController } from './trades.controller';
import { TradeService } from './trades.service';

@Module({
  controllers: [TradeController],
  providers: [TradeService],
})
export class TradesModule {}