import * as mongoose from 'mongoose';

export const TradeSchema = new mongoose.Schema({
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
  orders: Array,
  pending: Array,
  insertPubKey: String,
  insertProof: String,
  insertHash: String,
  insertAddress: String
});