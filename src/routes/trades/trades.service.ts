import { Injectable } from '@nestjs/common';
import * as RPC from '../../utils/rpc'
import * as Wallet from '../../utils/wallet'

@Injectable()
export class TradeService {
  async createTrade(): Promise<string> {
    
    return 'ok'
  }
}
