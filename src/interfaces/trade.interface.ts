import { Document } from 'mongoose';

export interface Trade extends Document {
    readonly address: String,
    readonly pubkey: String,
    readonly privkey: String,
    readonly asset: String,
    readonly pair: String,
    readonly type: String,
    readonly uuid: String,
    readonly state: String,
    readonly timestamp: Number,
    readonly expiration: Number,
    readonly executed: Boolean,
    readonly amountAsset: Number,
    readonly amountPair: Number,
    readonly senderAddress: String,
    readonly matcherAddress: String,
    readonly insertProof: String,
    readonly insertPubKey: String,
    readonly insertHash: String,
    readonly insertAddress: String,
}