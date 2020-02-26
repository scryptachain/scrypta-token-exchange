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

  async getNewAddress(): Promise<Object> {
    var wallet = new Wallet.Lyra;
    let address = await wallet.createnewaddress()
    return address
  }

  async sendLyra(info): Promise<Object> {
    if(info.from !== undefined && info.to !== undefined && info.amount !== undefined && info.private_key !== undefined){
      var idanode = new RPC.IdaNode;
      let response = await idanode.post('/send',{
        from: info.from,
        to: info.to,
        amount: info.amount,
        private_key: info.private_key
      })
      return response['data']['data']
    }else{
      return {
        success: false,
        message: "Send all the parameters."
      }
    }
  }

  async sendToken(info): Promise<Object> {
    if(info.from !== undefined && info.to !== undefined && info.amount !== undefined && info.private_key !== undefined && info.fee !== undefined && info.pubkey !== undefined && info.sidechain_address !== undefined){
      var idanode = new RPC.IdaNode;
      let responseSendLyra = await idanode.post('/send',{
        from: info.from,
        to: info.to,
        amount: info.fee,
        private_key: info.private_key
      });
      if(responseSendLyra['data']['data']['txid'] !== undefined && responseSendLyra['data']['data']['txid'] !== false){
        let response = await idanode.post('/sidechain/send',{
          from: info.from,
          to: info.to,
          amount: info.amount,
          private_key: info.private_key,
          pubkey: info.pubkey,
          sidechain_address: info.sidechain_address
        })
        return {
          sidechain: response['data'],
          lyra: responseSendLyra['data']['data']
        }
      }else{
        return {
          success: false,
          message: "Can't send Lyra Fees"
        }
      }
    }else{
      return {
        success: false,
        message: "Send all the parameters."
      }
    }
  }
}
