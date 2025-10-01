import type { AccountClass, AddressClass } from './classes.ts'

export interface AddressInterface {
    readonly address: string;
    readonly balance: number;
    readonly nonce: number;
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
