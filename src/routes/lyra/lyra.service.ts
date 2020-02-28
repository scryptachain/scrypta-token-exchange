import { Injectable } from '@nestjs/common';
import * as RPC from '../../utils/rpc'
import * as Wallet from '../../utils/wallet'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
import { Trade } from '../../interfaces/trade.interface'

@Injectable()
export class LyraService {
  constructor(@InjectModel('Trade') private readonly tradeModel: Model<Trade>) {}

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

  async getBalance(request): Promise<Number> {
    var idanode = new RPC.IdaNode;
    let balance = 0
    if(request.asset === 'LYRA'){
      let req = await idanode.get('/balance/' + request.address)
      balance = req['data']['balance']
    }else{
      let req = await idanode.post('/sidechain/balance', { dapp_address: request.address, sidechain_address: request.asset })
      balance = req['data']['balance']
    }
    return balance
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
      if(response['data']['data']['success'] === true && response['data']['data']['txid'] !== null && response['data']['data']['txid'] !== false){
        let tradeDB = await this.tradeModel.find({address: info.to }).exec()
        let trade = tradeDB[0]
        if(trade.uuid !== undefined){
          let pending = []
          if(trade.pending !== undefined){
            pending = trade.pending
          }
          pending.push({
            from: info.from,
            amount: info.amount,
            txid: response['data']['data']['txid']
          })
          await this.tradeModel.updateOne({ _id: trade._id }, { pending: pending })
        }
      }
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
        if(response['data']['uuid'] !== undefined && response['data']['txs'].length === 1){
          let tradeDB = await this.tradeModel.find({address: info.to }).exec()
          let trade = tradeDB[0]
          if(trade.uuid !== undefined){
            let pending = []
            if(trade.pending !== undefined){
              pending = trade.pending
            }
            pending.push({
              from: info.from,
              amount: info.amount,
              txid: response['data']['txs'][0]
            })
            await this.tradeModel.updateOne({ _id: trade._id }, { pending: pending })
          }
        }
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
