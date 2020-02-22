import { Injectable, Body } from '@nestjs/common'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
import { Trade } from '../../interfaces/trade.interface'
import * as RPC from '../../utils/rpc'
import * as Wallet from '../../utils/wallet'
const uuidv4 = require('uuid/v4')
var crypto = require('crypto')

@Injectable()
export class TradeService {
  constructor(@InjectModel('Trade') private readonly tradeModel: Model<Trade>) {}

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
      // check if address is valid
      let wallet = new RPC.Wallet
      let check = await wallet.request('validateaddress', [trade.senderAddress])
      if(check['result']['isvalid'] === false){
        valid = false
        return {
          success: false,
          message: "Sender address is not valid"
        }
      }
    }
    
    let expiration
    if(trade.expiration !== undefined && trade.expiration > 0){
      expiration = trade.expiration
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
        if(tt._id !== undefined && check.state !== 'Completed'){
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
        amountAsset: trade.amountAsset,
        amountPair: trade.amountPair,
        senderAddress: trade.senderAddress,
        matcherAddress: "",
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
}
