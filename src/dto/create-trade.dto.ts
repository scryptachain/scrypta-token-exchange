export class CreateTradeDto {
    readonly address: String;
    readonly pubkey: String;
    readonly privkey: String;
    readonly asset: String;
    readonly pair: String;
    readonly type: String;
}