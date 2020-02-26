const mongoose = require('mongoose');
import { TradeModel } from '../models/trades.model'
import * as RPC from '../utils/rpc'
var crypto = require('crypto')

module Daemon {

    export class Watch {

        public async expired() {
            return new Promise(async response => {
                mongoose.connect('mongodb://localhost/exchange', {useNewUrlParser: true, useUnifiedTopology: true});
                let idanode = new RPC.IdaNode
                let trades = await TradeModel.find({ $or: [ { state: 'Created' }, { state: 'Waiting' }, { state: 'Partial' }] }).exec()
                
                console.log('SEARCHING FOR EXPIRED TRADES')

                for(let x in trades){
                    let trade = trades[x]
                    console.log('CHECKING ' + trade.type + ' ' + trade.uuid)
                    console.log('TRADE ADDRESS IS ' + trade.address)
                    console.log('SIDECHAIN ADDRESS IS ' + trade.pair)

                    // CHECKING IF TRADE IS EXPIRED
                    let d = new Date()
                    let now = d.getTime() / 1000
                    now = parseInt(now.toFixed(0))
                    console.log('EXPIRATION IS ' + trade.expiration +', NOW IS ' + now)
                    if(now >= trade.expiration){
                        let refund = false
                        console.log('TRADE IS EXPIRED!')
                        var decipher = crypto.createDecipher('aes-256-cbc', process.env.SALT)
                        var dec = decipher.update(trade.privkey,'hex','utf8')
                        dec += decipher.final('utf8')
                        let private_key = dec.replace(/"/g, '')

                        if(trade.type === 'SELL'){
                            // RETURN SIDECHAIN FUNDS TO SENDER
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
                            // RETURN LYRA TO SENDER
                            let checkLyra = await idanode.get('/balance/' + trade.address)
                            let lyraBalance = checkLyra['data'].balance
                            if(lyraBalance > 0.001){
                                let amount = trade.amountAsset - 0.001
                                let txLyra = await idanode.post('/send',{
                                    from: trade.address,
                                    to: trade.senderAddress,
                                    amount: amount,
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
                }

                response(true)
            })
        }

        public async deposits() {
            return new Promise(async response => {
                mongoose.connect('mongodb://localhost/exchange', {useNewUrlParser: true, useUnifiedTopology: true});
                let idanode = new RPC.IdaNode
                let trades = await TradeModel.find({ $or: [ { state: 'Created' } ] }).exec()
                
                console.log('SEARCHING FOR INITIAL DEPOSITS')

                for(let x in trades){
                    let trade = trades[x]
                    console.log('CHECKING ' + trade.type + ' ' + trade.uuid)
                    console.log('TRADE ADDRESS IS ' + trade.address)
                    console.log('SIDECHAIN ADDRESS IS ' + trade.pair)

                    // CHECKING INITIAL LYRA BALANCE
                    let checkLyra = await idanode.get('/balance/' + trade.address)
                    let lyraBalance = checkLyra['data'].balance
                    let lyraNeeded = trade.amountAsset
                    if(trade.type === 'BUY' && lyraBalance === lyraNeeded){
                        if(trade.state === 'Created'){
                            await TradeModel.updateOne({ _id: trade._id }, { state: 'Waiting' });
                        }
                    }

                    // CHECKING INITIAL PAIR BALANCE
                    let checkPair = await idanode.post('/sidechain/balance', { sidechain_address: trade.pair, dapp_address: trade.address })
                    let pairBalance = checkPair['data'].balance
                    if(trade.type === 'SELL' && pairBalance === trade.amountPair){
                        if(trade.state === 'Created'){
                            await TradeModel.updateOne({ _id: trade._id }, { state: 'Waiting' });
                        }
                    }
                    
                }

                response(true)
            })
        }

        public async matches() {
            return new Promise(async response => {
                mongoose.connect('mongodb://localhost/exchange', {useNewUrlParser: true, useUnifiedTopology: true});
                let idanode = new RPC.IdaNode
                let trades = await TradeModel.find({ $or: [ { state: 'Waiting' }, { state: 'Partial' }] }).exec()
                
                console.log('SEARCHING FOR UNEXECUTED TRADES')

                for(let x in trades){
                    let trade = trades[x]
                    console.log('CHECKING ' + trade.type + ' ' + trade.uuid)
                    console.log('TRADE ADDRESS IS ' + trade.address)
                    console.log('SIDECHAIN ADDRESS IS ' + trade.pair)
                                            
                    var decipher = crypto.createDecipher('aes-256-cbc', process.env.SALT)
                    var dec = decipher.update(trade.privkey,'hex','utf8')
                    dec += decipher.final('utf8')
                    let private_key = dec.replace(/"/g, '')

                    if(trade.type === 'SELL'){
                        // CHECKING FOR TRANSACTIONS
                        let transactions = await idanode.get('/transactions/' + trade.address)
                        if(transactions['data']['data'].length > 0){
                            for(let x in transactions['data']['data']){
                                let valid = true
                                let transaction = transactions['data']['data'][x]
                                let matcher = transaction['from'][0]
                                if(matcher === trade.address){
                                    valid = false
                                }else{
                                    console.log('FOUND INCOMING TRANSACTION OF ' + transaction['value'] + ' FROM ' + matcher)
                                }
                                let price = trade.amountAsset / trade.amountPair
                                let amountAssetExchange = transaction['value']
                                let amountPairExchange = transaction['value'] / price
                                let found = false
                                let amountReceived = 0
                                let orders = []
                                
                                if(valid === true){
                                    if(trade.orders !== undefined){
                                        orders = trade.orders
                                    }

                                    for(let y in trade.orders){
                                        let order = trade.orders[y]
                                        if(order.txid === transaction['txid']){
                                            found = true
                                            console.log('TRANSACTION COMPLETED YET.')
                                        }
                                        amountReceived += order['value']
                                    }

                                    if(found === false){
                                        valid = true
                                        orders.push(transaction)
                                        amountReceived += transaction['value']
                                        await TradeModel.updateOne({ _id: trade._id }, { orders: orders });
                                    }else{
                                        valid = false
                                    }
                                }
                                if(valid === true && found === false){
                                    // SENDING SIDECHAIN ASSET TO MATCHER AND LYRA TO SENDER
                                    let amount = amountAssetExchange - 0.002
                                    let txLyra = await idanode.post('/send',{
                                        from: trade.address,
                                        to: trade.senderAddress,
                                        amount: amount,
                                        private_key: private_key
                                    })
                                    console.log('LYRA TX IS ' + JSON.stringify(txLyra['data']))
                                    if(txLyra['data']['data']['success'] === true && txLyra['data']['data']['txid'] !== false){
                                        let txPair = await idanode.post('/sidechain/send',{
                                            sidechain_address: trade.pair,
                                            from: trade.address,
                                            to: matcher,
                                            amount: amountPairExchange,
                                            pubkey: trade.pubkey,
                                            private_key: private_key
                                        })
                                        console.log('SIDECHAIN TX IS ' + JSON.stringify(txPair['data']))
                                        if(txPair['data']['txs'][0] !== undefined){
                                            if(amountReceived === trade.amountAsset){
                                                await TradeModel.updateOne({ _id: trade._id }, { state: 'Completed', executed: true });
                                                console.log('TRADE COMPLETED!')
                                            }else{
                                                await TradeModel.updateOne({ _id: trade._id }, { state: 'Partial' });
                                                console.log('TRADE PARTIALLY COMPLETED!')
                                            }
                                        }else{
                                            console.log("CAN'T SEND SIDECHAIN ASSET!")
                                        }
                                    }else{
                                        console.log("CAN'T SEND LYRA!")
                                    }
                                }
                            }
                        }else{
                            console.log('NO TRANSACTIONS')
                        }
                    }else if(trade.type === 'BUY'){
                        let transactions = await idanode.post('/sidechain/transactions', { sidechain_address: trade.pair, dapp_address: trade.address })
                        if(transactions['data']['transactions'].length > 0){
                            for(let x in transactions['data']['transactions']){
                                let valid = false
                                let transaction = transactions['data']['transactions'][x]
                                let matcher = transaction['from']
                                if(matcher === trade.address){
                                    valid = false
                                }else{
                                    console.log('FOUND INCOMING TRANSACTION OF ' + transaction['amount'] + ' FROM ' + matcher)
                                    valid = true
                                }

                                let price = trade.amountAsset / trade.amountPair
                                let amountAssetExchange = transaction['amount'] * price
                                let amountPairExchange = transaction['amount']
                                let found = false
                                let amountReceived = 0
                                let orders = []
                                if(valid === true){
                                    if(trade.orders !== undefined){
                                        orders = trade.orders
                                    }

                                    for(let y in trade.orders){
                                        let order = trade.orders[y]
                                        if(order.sxid === transaction['sxid']){
                                            found = true
                                            console.log('TRANSACTION COMPLETED YET.')
                                        }
                                        amountReceived += order['amount']
                                    }

                                    if(found === false){
                                        valid = true
                                        orders.push(transaction)
                                        amountReceived += transaction['amount']
                                        await TradeModel.updateOne({ _id: trade._id }, { orders: orders });
                                    }else{
                                        valid = false
                                    }
                                }
                                
                                if(valid === true && found === false){
                                    // SENDING SIDECHAIN ASSET TO SENDER AND LYRA TO MATCHER
                                    let amount = amountAssetExchange - 0.002
                                    let txLyra = await idanode.post('/send',{
                                        from: trade.address,
                                        to: matcher,
                                        amount: amount,
                                        private_key: private_key
                                    })
                                    console.log('LYRA TX IS ' + JSON.stringify(txLyra['data']))
                                    if(txLyra['data']['data']['success'] === true && txLyra['data']['data']['txid'] !== false){
                                        let txPair = await idanode.post('/sidechain/send',{
                                            sidechain_address: trade.pair,
                                            from: trade.address,
                                            to: trade.senderAddress,
                                            amount: amountPairExchange,
                                            pubkey: trade.pubkey,
                                            private_key: private_key
                                        })
                                        console.log('SIDECHAIN TX IS ' + JSON.stringify(txPair['data']))
                                        if(txPair['data']['error'] === undefined && txPair['data']['txs'][0] !== undefined){
                                            if(amountReceived === trade.amountPair){
                                                await TradeModel.updateOne({ _id: trade._id }, { state: 'Completed', executed: true });
                                                console.log('TRADE COMPLETED!')
                                            }else{
                                                await TradeModel.updateOne({ _id: trade._id }, { state: 'Partial' });
                                                console.log('TRADE PARTIALLY COMPLETED!')
                                            }
                                        }else{
                                            console.log("CAN'T SEND SIDECHAIN ASSET!")
                                        }
                                    }else{
                                        console.log("CAN'T SEND LYRA!")
                                    }
                                }
                            }
                        }else{
                            console.log('NO TRANSACTIONS')
                        }
                    }

                }

                response(true)
            })
        }
    }

}

export = Daemon