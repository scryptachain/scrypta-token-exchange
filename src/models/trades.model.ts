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
  orders: Array,
  pending: Array,
  senderAddress: String,
  insertPubKey: String,
  insertProof: String,
  insertHash: String,
  insertAddress: String
});