export class CreateTradeDto {
    readonly amountAsset: Number;
    readonly amountPair: Number;
    readonly insertProof: String;
    readonly insertPubKey: String;
    readonly insertHash: String;
    readonly insertAddress: String;
    readonly asset: String;
    readonly pair: String;
    readonly type: String;
}