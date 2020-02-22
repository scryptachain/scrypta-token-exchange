const mongoose = require('mongoose');

export const TradeModel = mongoose.model('Trade',{
  address: String,
  pubkey: String,
  privkey: String,
  asset: String,
  pair: String,
  type: String,
  uuid: String,
  state: String,
  timestamp: Number,
  expiration: Number,
  executed: Boolean,
  amountAsset: Number,
  amountPair: Number,
  senderAddress: String,
  matcherAddress: String,
  insertPubKey: String,
  insertProof: String,
  insertHash: String,
  insertAddress: String
});