import type { Token } from "./interfaces";
/// :::::::::::::::::: Paths :::::::::::::::::::::::

export const WALLET_PATH: string = "wallet/wallet_data.json";
export const BLOCKCHAIN_PATH: string = "blockchain/blockchain.json";
export const UNVERIFIED_BLOCKS_PATH: string = "blockchain/unverified_blocks_pool.json";
export const UNVERIFIED_TRANSACTIONS_PATH: string = "blockchain/unverified_transactions_pool.json";

/// :::::::::::::::::: Values ::::::::::::::::::::::
export const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const NATIVE_TOKEN: Token = {
  tokenId: 'd',
  name: 'granite',
  contractAddress: 's',
  ticker: 'gran',
  totalSupply: 1000000000, // 100 Million Native Tokens
  circulatingSupply: 10 // 10 Native Tokens in supply, the balance of the genesis sender and genesis receiver.
};


