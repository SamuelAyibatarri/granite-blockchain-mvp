import type { AccountClass, AddressClass } from './classes.ts'

export interface AddressInterface {
    readonly publicKeyHex: string;
    readonly balance: number;
    readonly nonce: number;
}

export interface WalletData {
    readonly accountDetails: AccountInterface<AddressInterface>;
    readonly transactionHistory: {
        TxIN: Transaction[];
        TxOut: Transaction[];
    }
}

export interface Block {
    readonly prevBlockHash: string ;
    readonly currentBlockHash: string;
    readonly blockIndex: number;
    readonly blockHash: string;
    readonly transaction: [VerifiedTransaction, VerifiedTransaction, VerifiedTransaction, VerifiedTransaction, VerifiedTransaction]; /// maximum and minimum of 5 transactions make up a complete block
    readonly timestamp: number;
    readonly validator: string;
    readonly accumulatorRoot: string;
    readonly difficulty: number;
}

export interface blockchainState {
  readonly chainLength: number;
  readonly chainSize: number;
  readonly nativeToken: Token;
}


export interface Blockchain {
  readonly blocks: Block[];
  readonly stateRoot: string;
  readonly state: blockchainState;
}


export interface AccountInterface<T = AddressClass | AddressInterface> {
    readonly privateKeyHex: string;
    readonly address: T;
}

export interface NFTContractAddress {
    readonly prefix: string;
    readonly address: string;
}

export interface NFTMetadata {
    readonly name: string;
    readonly description: string;
    readonly imageURL: string; // URL to an image
    readonly checksum: string;
}

export interface Transaction<Taddress = AddressClass | AddressInterface> {
    readonly  sender: Taddress;
    readonly recipient: Taddress;
    readonly token: Token;
    readonly value: number;
    readonly gasfee: number;
    readonly txHash: string;
    readonly signature: Signature;
    readonly txSecret: string;
    readonly txSecretDiff: number;
}

export interface VerifiedTransaction<Taddress = AddressClass | AddressInterface> {
    readonly  sender: Taddress;
    readonly recipient: Taddress;
    readonly token: Token;
    readonly value: number;
    readonly gasfee: number;
    readonly txHash: string;
    readonly signature: Signature;
    readonly txSecret: string;
    readonly txSecretDiff: number;
    readonly blockIndex: number;
}

export interface NFT {
    readonly tokenId: string;
    readonly contractAddress: NFTContractAddress;
    readonly metadata: NFTMetadata;
}

export interface Token {
    readonly tokenId: string;
    readonly name: string;
    readonly contractAddress: string;
    readonly ticker: string;
    readonly totalSupply: number;
    readonly circulatingSupply: number;
}

export interface Signature {
    r: string;
    s: string;
}
