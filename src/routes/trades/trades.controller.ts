import { Controller, Get, Post, Body } from '@nestjs/common';
import { TradeService } from './trades.service';
import { CreateTradeDto } from '../../dto/create-trade.dto';

@Controller('trades')
export class TradeController {
  constructor(private readonly trades: TradeService) {}

  @Post('get')
  async getSingleTrade(@Body() trade): Promise<Object> {
    return await this.trades.getSingleTrade(trade)
  }

  @Post('create')
  async createtrade(@Body() trade: CreateTradeDto): Promise<Object> {
    return await this.trades.createTrade(trade)
  }

  @Post('cancel')
  async canceltrade(@Body() trade: CreateTradeDto): Promise<Object> {
    return await this.trades.cancelTrade(trade)
  }

  @Post('active')
  async returnActiveTrades(@Body() trade: CreateTradeDto): Promise<Object> {
    return await this.trades.returnActiveTrades(trade)
  }

  @Post('history')
  async returnHistoricTrades(@Body() trade: CreateTradeDto): Promise<Object> {
    return await this.trades.returnHistoricTrades(trade)
  }
}