import { Injectable, Body } from '@nestjs/common'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
import { Trade } from '../../interfaces/trade.interface'
import * as RPC from '../../utils/rpc'
import * as Wallet from '../../utils/wallet'
import { parse } from 'querystring'
const uuidv4 = require('uuid/v4')
var crypto = require('crypto')

@Injectable()
export class TradeService {
  constructor(@InjectModel('Trade') private readonly tradeModel: Model<Trade>) {}

  async returnHistoricTrades(trade): Promise<Object> {

    if(trade.asset !== undefined && trade.pair !== undefined){
      let tradesDB = await this.tradeModel.find({state: 'Completed', asset: trade.asset, pair: trade.pair}).sort({timestamp: 1}).exec();
      let trades = []
      let last = 0

      for(let x in tradesDB){
        let trade = tradesDB[x]
        let price = trade.amountAsset / trade.amountPair
        last = price

        trades.push({
          address: trade.address,
          asset: trade.asset,
          pair: trade.pair,
          type: trade.type,
          timestamp: trade.timestamp,
          expiration: trade.expiration,
          amountAsset: trade.amountAsset,
          amountPair: trade.amountPair,
          uuid: trade.uuid,
          hash: trade.insertHash
        })
      }
      return {
        price: last,
        trades: trades
      }
    }else{
      return {
        message: 'Provide asset and pair parameters first.'
      }
    }
  }

  async returnActiveTrades(filter): Promise<Object> {
    if(filter.asset !== undefined && filter.pair !== undefined){
      let tradesDB = await this.tradeModel.find({ $or: [ { state: 'Waiting' }, { state: 'Partial' }] }).exec()
      let trades = []
      
      for(let x in tradesDB){
        let trade = tradesDB[x]
        if(trade.asset === filter.asset && trade.pair === filter.pair){
          let amountRemainAsset = trade.amountAsset
          let amountRemainPair = trade.amountPair
          let price = trade.amountAsset / trade.amountPair
          
          if(trade.type === 'BUY'){
            for(let x in trade.orders){
              amountRemainPair = amountRemainPair - trade.orders[x].amountPair
            }
            amountRemainAsset = amountRemainPair * price
            amountRemainAsset = parseFloat(amountRemainAsset.toFixed(8))
          }else if(trade.type === 'SELL'){
            for(let x in trade.orders){
              amountRemainAsset = amountRemainAsset - trade.orders[x].value + 0.002
            }
            amountRemainAsset = parseFloat(amountRemainAsset.toFixed(8))
            amountRemainPair = amountRemainAsset / price
          }

          trades.push({
            address: trade.address,
            asset: trade.asset,
            pair: trade.pair,
            type: trade.type,
            timestamp: trade.timestamp,
            expiration: trade.expiration,
            amountAsset: amountRemainAsset,
            amountPair: amountRemainPair,
            uuid: trade.uuid,
            hash: trade.insertHash
          })
        }
      }
      return trades
    }else{
      return {
        message: 'Provide asset and pair parameters first.'
      }
    }
  }

  async createTrade(trade): Promise<Object> {
    let valid = true
    let idanode = new RPC.IdaNode
    if(trade.asset !== undefined){
      if(trade.asset !== 'LYRA'){
        let check = await idanode.post('/sidechain/get',{sidechain_address: trade.asset})
        if(check['data']['status'] === 422){
          valid = false
          return {
            success: false,
            message: "Asset sidechain not found"
          }
        }
      }
    }else{
      valid = false
      return {
        success: false,
        message: "Asset is not defined"
      }
    }

    if(valid === true && trade.pair !== undefined){
      console.log('CHECKING SIDECHAIN')
      if(trade.pair !== 'LYRA'){
        let check = await idanode.post('/sidechain/get',{sidechain_address: trade.pair})
        if(check['data']['status'] === 422){
          valid = false
          return {
            success: false,
            message: "Pair sidechain not found"
          }
        }
      }
    }else{
      valid = false
      return {
        success: false,
        message: "Pair is not defined"
      }
    }

    if(valid === true && trade.type !== undefined){
      if(trade.type !== 'BUY' && trade.type !== 'SELL'){
        valid = false
        return {
          success: false,
          message: "Type is invalid, must be BUY or SELL"
        }
      }
    }else{
      valid = false
      return {
        success: false,
        message: "Type is not defined"
      }
    }

    if(valid === true && trade.amountAsset !== undefined){
      if(parseFloat(trade.amountAsset) <= 0){
        valid = false
      }
    }else{
      valid = false
      return {
        success: false,
        message: "Amount asset is not defined"
      }
    }

    if(valid === true && trade.amountPair !== undefined){
      if(parseFloat(trade.amountPair) <= 0){
        valid = false
      }
    }else{
      valid = false
      return {
        success: false,
        message: "Amount pair is not defined"
      }
    }

    if(valid === true && trade.senderAddress !== undefined){
      let wallet = new RPC.Wallet
      let check = await wallet.request('validateaddress', [trade.senderAddress])
      if(check['result'] !== undefined){
        if(check['result']['isvalid'] === false){
          valid = false
          return {
            success: false,
            message: "Sender address is not valid"
          }
        }
      }else{
        valid = false
        return {
          success: false,
          message: "Can't connect to LYRA wallet"
        }
      }
    }
    
    let expiration
    if(trade.expiration !== undefined && trade.expiration > 0){
      let d = new Date()
      let now = d.getTime() / 1000
      if(now < trade.expiration){
        expiration = trade.expiration
      }else{
        valid = false
        return {
          success: false,
          message: 'Expiration is in the past.'
        }
      }
    }else{
      var d = new Date();
      d.setMonth(d.getMonth() + 1)
      d.setHours(0, 0, 0)
      d.setMilliseconds(0)
      expiration = d.getTime() / 1000
    }

    let insertHash = ''
    let insertAddress = ''
    if(valid === true && trade.insertProof !== undefined && trade.insertPubKey !== undefined){
      let proof = {
        asset: trade.asset, 
        pair: trade.pair,
        type: trade.type,
        amountAsset: trade.amountAsset,
        amountPair: trade.amountPair,
        senderAddress: trade.senderAddress
      }
      let wallet = new Wallet.Lyra
      let check = await wallet.verifyMessage(trade.insertPubKey, trade.insertProof, JSON.stringify(proof))
      if(check === false){
        valid = false
        return {
          success: false,
          message: "Can't validate proof signature."
        }
      }else{
        insertHash = check['hash']
        insertAddress = check['address']
      }
    }else{
      valid = false
      return {
        success: false,
        message: "Insert Proof or PubKey is invalid"
      }
    }

    if(valid === true){
      
      let check = await this.tradeModel.find({insertHash: insertHash}).exec();
      for(let x in check){
        let tt = check[x]
        if(tt._id !== undefined && tt.state !== 'Completed' && tt.state !== 'Canceled'){
          valid = false
          return {
            success: false,
            message: "This trade exist yet."
          }
        }
      }
    }

    if(valid === true){

      let wallet = new Wallet.Lyra
      let escrow = await wallet.createnewaddress()
      let uuid = uuidv4()
      let timestamp = Math.floor(Date.now() / 1000)

      const cipher = crypto.createCipher('aes-256-cbc', process.env.SALT)
      let private_key = cipher.update(JSON.stringify(escrow['private_key']), 'utf8', 'hex')
      private_key += cipher.final('hex')

      let newTrade = {
        address: escrow['address'],
        pubkey: escrow['pub_key'],
        privkey: private_key,
        asset: trade.asset,
        pair: trade.pair,
        type: trade.type,
        uuid: uuid,
        state: 'Created',
        timestamp: timestamp,
        expiration: expiration,
        executed: false,
        orders: [],
        amountAsset: trade.amountAsset,
        amountPair: trade.amountPair,
        senderAddress: trade.senderAddress,
        insertPubKey: trade.insertPubKey,
        insertProof: trade.insertProof,
        insertHash: insertHash,
        insertAddress: insertAddress
      }

      const createdTrade = new this.tradeModel(newTrade);
      let saved = await createdTrade.save()

      if(saved._id !== undefined){
        return {
          success: true,
          uuid: uuid,
          address: escrow['address'],
          type: trade.type
        }
      }else{
        return {
          error: true,
          message: "Trade can't be saved."
        }
      }

    }
  }

  async cancelTrade(trade): Promise<Object> {
    let response
    let valid = true
    if(trade.tradeUUID !== undefined && trade.cancelProof !== undefined && trade.cancelPubKey !== undefined){
      let checkTrade = await this.tradeModel.find({uuid: trade.tradeUUID}).exec();
      if(checkTrade[0]._id !== undefined){
        if(checkTrade[0].state === 'Created' || checkTrade[0].state === 'Waiting'){
          if(checkTrade[0].insertPubKey === trade.cancelPubKey){
            let proof = {
              uuid: trade.tradeUUID,
              action: 'cancelTrade'
            }
            let wallet = new Wallet.Lyra
            let check = await wallet.verifyMessage(trade.cancelPubKey, trade.cancelProof, JSON.stringify(proof))
            if(check === false){
              valid = false
              return {
                success: false,
                message: "Can't validate proof signature."
              }
            }

            if(valid === true){
              let refund = false
              var decipher = crypto.createDecipher('aes-256-cbc', process.env.SALT)
              var dec = decipher.update(checkTrade[0].privkey,'hex','utf8')
              dec += decipher.final('utf8')
              let private_key = dec.replace(/"/g, '')
              let idanode = new RPC.IdaNode
              let refundTx

              if(checkTrade[0].type === 'SELL'){
                  // RETURN SIDECHAIN FUNDS TO SENDER
                  let checkPair = await idanode.post('/sidechain/balance', { sidechain_address: checkTrade[0].pair, dapp_address: checkTrade[0].address })
                  let pairBalance = checkPair['data'].balance
                  if(pairBalance >= checkTrade[0].amountPair){
                      let txPair = await idanode.post('/sidechain/send',{
                          sidechain_address: checkTrade[0].pair,
                          from: checkTrade[0].address,
                          to: checkTrade[0].senderAddress,
                          amount: checkTrade[0].amountPair,
                          pubkey: checkTrade[0].pubkey,
                          private_key: private_key
                      })
                      refundTx = txPair['data']
                      console.log('REFUND TX IS ' + JSON.stringify(txPair['data']))
                      if(txPair['data']['txs'][0] !== undefined){
                          refund = true
                      }
                  }else{
                      refund = true
                  }
              }else{
                  // RETURN LYRA TO SENDER
                  let checkLyra = await idanode.get('/balance/' + checkTrade[0].address)
                  let lyraBalance = checkLyra['data'].balance
                  if(lyraBalance > 0.001){
                      let amount = checkTrade[0].amountAsset - 0.001
                      let txLyra = await idanode.post('/send',{
                          from: checkTrade[0].address,
                          to: checkTrade[0].senderAddress,
                          amount: amount,
                          private_key: private_key
                      })
                      console.log('REFUND TX IS ' + JSON.stringify(txLyra['data']))
                      refundTx = txLyra['data']
                      if(txLyra['data']['data']['success'] === true && txLyra['data']['data']['txid'] !== false){
                          refund = true
                      }
                  }else{
                      refund = true
                  }
              }
              if(refund === true){
                  await this.tradeModel.updateOne({ _id: checkTrade[0]._id }, { state: 'Canceled' });
                  return {
                    success: true,
                    refundTx: refundTx,
                    message: "Order canceled."
                  }
              }else{
                return {
                  success: false,
                  message: "Return failed, please retry."
                }
              }
            }
          }else{
            valid = false
            return {
              success: false,
              message: "Not authorized."
            }
          }
        }else{
          valid = false
          return {
            success: false,
            message: "Trade canceled yet."
          }
        }
      }else{
        valid = false
        return {
          success: false,
          message: "Can't find trade."
        }
      }
    }else{
      valid = false
      return {
        success: false,
        message: "Delete Proof or PubKey is invalid"
      }
    }
    return response
  }
}
