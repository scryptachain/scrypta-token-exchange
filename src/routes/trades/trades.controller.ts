import { Controller, Get, Post, Body } from '@nestjs/common';
import { TradeService } from './trades.service';
import { CreateTradeDto } from '../../dto/create-trade.dto';

@Controller('trades')
export class TradeController {
  constructor(private readonly trades: TradeService) {}

  @Post('create')
  async createtrade(@Body() trade: CreateTradeDto): Promise<Object> {
    return await this.trades.createTrade(trade)
  }

  @Post('cancel')
  async canceltrade(@Body() trade: CreateTradeDto): Promise<Object> {
    return await this.trades.cancelTrade(trade)
  }

  @Get('active')
  async returnActiveTrades(): Promise<Object> {
    return await this.trades.returnActiveTrades()
  }
}