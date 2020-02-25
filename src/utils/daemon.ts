const mongoose = require('mongoose');
import { TradeModel } from '../models/trades.model'
import * as RPC from '../utils/rpc'
var crypto = require('crypto')

module Daemon {

    export class Watch {

        public async trades() {
            return new Promise(async response => {
                console.log('CHECKING ALL TRADES')
                mongoose.connect('mongodb://localhost/exchange', {useNewUrlParser: true, useUnifiedTopology: true});
                let idanode = new RPC.IdaNode
                let trades = await TradeModel.find({ state: 'Created' }).exec()
                
                for(let x in trades){
                    let trade = trades[x]
                    console.log('CHECKING ' + trade.type + ' ' + trade.uuid)
                    if(trade.asset === 'LYRA'){
                        let valid = true
                        console.log('TRADE ADDRESS IS ' + trade.address)
                        console.log('SIDECHAIN ADDRESS IS ' + trade.pair)

                        // CHECKING IF TRADE IS EXPIRED
                        let d = new Date()
                        let now = d.getTime() / 1000
                        now = parseInt(now.toFixed(0))
                        console.log('EXPIRATION IS ' + trade.expiration +', NOW IS ' + now)
                        if(now >= trade.expiration){
                            valid = false
                            let refund = false
                            console.log('TRADE IS EXPIRED!')
                            var decipher = crypto.createDecipher('aes-256-cbc', process.env.SALT)
                            var dec = decipher.update(trade.privkey,'hex','utf8')
                            dec += decipher.final('utf8')
                            let private_key = dec.replace(/"/g, '')

                            if(trade.type === 'SELL'){
                                // TODO: RETURN SIDECHAIN FUNDS TO SENDER
                                let checkPair = await idanode.post('/sidechain/balance', { sidechain_address: trade.pair, dapp_address: trade.address })
                                let pairBalance = checkPair['data'].balance
                                if(pairBalance >= trade.amountPair){
                                    let txPair = await idanode.post('/sidechain/send',{
                                        sidechain_address: trade.pair,
                                        from: trade.address,
                                        to: trade.senderAddress,
                                        amount: trade.amountPair,
                                        pubkey: trade.pubkey,
                                        private_key: private_key
                                    })
                                    console.log('REFUND TX IS ' + JSON.stringify(txPair['data']))
                                    if(txPair['data']['txs'][0] !== undefined){
                                        refund = true
                                    }
                                }else{
                                    refund = true
                                }
                            }else{
                                // TODO: RETURN LYRA TO SENDER
                                let checkLyra = await idanode.get('/balance/' + trade.address)
                                let lyraBalance = checkLyra['data'].balance
                                if(lyraBalance > 0.001){
                                    let txLyra = await idanode.post('/send',{
                                        from: trade.address,
                                        to: trade.senderAddress,
                                        amount: trade.amountAsset,
                                        private_key: private_key
                                    })
                                    console.log('REFUND TX IS ' + JSON.stringify(txLyra['data']))
                                    if(txLyra['data']['data']['success'] === true && txLyra['data']['data']['txid'] !== false){
                                        refund = true
                                    }
                                }else{
                                    refund = true
                                }
                            }
                            if(refund === true){
                                await TradeModel.updateOne({ _id: trade._id }, { state: 'Expired' });
                            }
                        }

                        if(valid === true){
                            // CHECKING LYRA BALANCE
                            let checkLyra = await idanode.get('/balance/' + trade.address)
                            let lyraBalance = checkLyra['data'].balance
                            let lyraNeeded = trade.amountAsset + 0.002
                            if(lyraBalance < lyraNeeded){
                                valid = false
                                console.log('LYRA BALANCE IS ' + lyraBalance + ', EXPECTED ' + lyraNeeded)
                            }else{
                                console.log('LYRA BALANCE MATCHES, NOW IS ' + lyraBalance)
                            }

                            // CHECKING PAIR BALANCE
                            let checkPair = await idanode.post('/sidechain/balance', { sidechain_address: trade.pair, dapp_address: trade.address })
                            let pairBalance = checkPair['data'].balance
                            if(pairBalance < trade.amountPair){
                                valid = false
                                console.log('PAIR BALANCE IS ' + pairBalance + ', EXPECTED ' + trade.amountPair)
                            }else{
                                console.log('PAIR BALANCE MATCHES, NOW IS ' + pairBalance)
                            }
                        }
                        let matcher = ''
                        if(trade.matcherAddress !== ''){
                            matcher = trade.matcherAddress
                        }else{
                            if(trade.type === 'SELL'){
                                let transactions = await idanode.get('/transactions/' + trade.address)
                                matcher = transactions['data']['data'][0]['from'][0]
                            }else{
                                let transactions = await idanode.post('/sidechain/transactions', { sidechain_address: trade.pair, dapp_address: trade.address })
                                if(transactions['data']['transactions'][0] !== undefined){
                                    matcher = transactions['data']['transactions'][0]['from']
                                }
                            }
                        }
                        if(matcher === ''){
                            valid = false
                            console.log("CAN'T FIND MATCHER!")
                        }else{
                            console.log('MATCHER IS ' + matcher)
                        }
                        if(valid === true){
                            console.log('PERFORMING SWAP!')
                            var decipher = crypto.createDecipher('aes-256-cbc', process.env.SALT)
                            var dec = decipher.update(trade.privkey,'hex','utf8')
                            dec += decipher.final('utf8')
                            let private_key = dec.replace(/"/g, '')
                            if(trade.type === 'SELL'){
                                // SENDING SIDECHAIN ASSET TO MATCHER AND LYRA TO SENDER
                                let txLyra = await idanode.post('/send',{
                                    from: trade.address,
                                    to: trade.senderAddress,
                                    amount: trade.amountAsset,
                                    private_key: private_key
                                })
                                console.log('LYRA TX IS ' + JSON.stringify(txLyra['data']))
                                if(txLyra['data']['data']['success'] === true && txLyra['data']['data']['txid'] !== false){
                                    let txPair = await idanode.post('/sidechain/send',{
                                        sidechain_address: trade.pair,
                                        from: trade.address,
                                        to: matcher,
                                        amount: trade.amountPair,
                                        pubkey: trade.pubkey,
                                        private_key: private_key
                                    })
                                    if(txPair['data']['txs'][0] !== undefined){
                                        console.log('SIDECHAIN TX IS ' + JSON.stringify(txPair['data']))
                                        await TradeModel.updateOne({ _id: trade._id }, { state: 'Completed', executed: true });
                                        console.log('TRADE COMPLETED!')
                                    }else{
                                        console.log("CAN'T SEND SIDECHAIN ASSET!")
                                    }
                                }else{
                                    console.log("CAN'T SEND LYRA!")
                                }
                            }else{
                                // SENDING SIDECHAIN ASSET TO SENDER AND LYRA TO MATCHER
                                let txLyra = await idanode.post('/send',{
                                    from: trade.address,
                                    to: matcher,
                                    amount: trade.amountAsset,
                                    private_key: private_key
                                })
                                console.log('LYRA TX IS ' + JSON.stringify(txLyra['data']))
                                if(txLyra['data']['data']['success'] === true && txLyra['data']['data']['txid'] !== false){
                                    let txPair = await idanode.post('/sidechain/send',{
                                        sidechain_address: trade.pair,
                                        from: trade.address,
                                        to: trade.senderAddress,
                                        amount: trade.amountPair,
                                        pubkey: trade.pubkey,
                                        private_key: private_key
                                    })
                                    if(txPair['data']['txs'][0] !== undefined){
                                        console.log('SIDECHAIN TX IS ' + JSON.stringify(txPair['data']))
                                        await TradeModel.updateOne({ _id: trade._id }, { state: 'Completed', executed: true });
                                        console.log('TRADE COMPLETED!')
                                    }else{
                                        console.log("CAN'T SEND SIDECHAIN ASSET!")
                                    }
                                }else{
                                    console.log("CAN'T SEND LYRA!")
                                }

                            }
                        }
                    }else{
                        // TODO: Create other exchange pair with BTC, ETH, etc.
                    }
                }

                console.log('CHECKING COMPLETED')
                setTimeout(function(){
                    let daemon = new Daemon.Watch
                    daemon.trades()
                }, 30000)
                response(true)
            })
        }
    }

}

export = Daemon