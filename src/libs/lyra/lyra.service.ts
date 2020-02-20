import { Injectable } from '@nestjs/common';
import * as RPC from '../../utils/rpc'

@Injectable()
export class LyraService {
  async getInfo(): Promise<string> {
    var wallet = new RPC.Wallet;
    let request = await wallet.request('getinfo')
    return request['result']
  }
}
