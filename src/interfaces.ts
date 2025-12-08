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

export interface UnverifiedTransactionPoolInterface {
  pool: Transaction[];
}

export interface Block {
  readonly prevBlockHash: string;
  readonly currentBlockHash: string;
  readonly blockIndex: number;
  readonly blockHash: string;
  readonly transaction: VerifiedTransaction<AddressInterface>; /// Just one transaction per block to reduce complexity
  readonly timestamp: number;
  readonly validator: string;
  readonly accumulatorRoot: string;
  readonly difficulty: number;
}

export interface blockchainState {
  readonly chainLength: number;
  readonly chainSize: number;
  readonly nativeToken: Token;
  readonly cumulativeDifficulty: number;
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

export interface Transaction<Taddress = AddressClass | AddressInterface> {
  readonly nonce: number;
  readonly sender: Taddress;
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
  readonly nonce: number;
  readonly sender: Taddress;
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
