import type * as Interfaces from "./interfaces";
import { genesisSender, genesisTx } from "./data";
/// :::::::::::::::::: Paths :::::::::::::::::::::::

export const WALLET_PATH: string = "wallet/wallet_data.json";
export const BLOCKCHAIN_PATH: string = "blockchain/blockchain.json";
export const UNVERIFIED_BLOCKS_PATH: string = "blockchain/unverified_blocks_pool.json";
export const UNVERIFIED_TRANSACTIONS_PATH: string = "blockchain/unverified_transactions_pool.json";

/// :::::::::::::::::: Values ::::::::::::::::::::::
export const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const NATIVE_TOKEN: Interfaces.Token = {
  tokenId: 'd',
  name: 'granite',
  contractAddress: 's',
  ticker: 'gran',
  totalSupply: 1000000000, // 100 Million Native Tokens
  circulatingSupply: 10 // 10 Native Tokens in supply, the balance of the genesis sender and genesis receiver.
};

export const genesisBlock: Interfaces.Block = {
  prevBlockHash: "null",
  currentBlockHash: 'aeebad4a796fcc2e15dc4c6061b45ed9b373f26adfc798ca7d2d8cc58182718e',
  blockIndex: 0,
  transaction: genesisTx, /// Reminder: -> Modify this to the genesis transaction
  timestamp: Date.now(),
  validator: genesisSender.publicKeyHex,
  difficulty: 1 /// Reminder: -> Don't leave this like this
}


