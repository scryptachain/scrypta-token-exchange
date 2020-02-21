import { Injectable } from '@nestjs/common';
import * as RPC from '../../utils/rpc'
import * as Wallet from '../../utils/wallet'

@Injectable()
export class LyraService {
  async getInfo(): Promise<string> {
    var wallet = new RPC.Wallet;
    let request = await wallet.request('getinfo')
    return request['result']
  }

  async getNewAddress(): Promise<string> {
    var wallet = new Wallet.Lyra;
    let address = await wallet.createnewaddress()
    return JSON.stringify(address)
  }
}
