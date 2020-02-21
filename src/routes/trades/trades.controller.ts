import { Controller, Get, Post } from '@nestjs/common';
import { TradeService } from './trades.service';

@Controller('trades')
export class TradeController {
  constructor(private readonly trades: TradeService) {}

  @Post('create')
  async createtrade(): Promise<string> {
    return await this.trades.createTrade()
  }
}