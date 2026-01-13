import { BlockchainSchema, Transaction } from './zod';
// import CryptoJS from 'crypto-js';
import { createHash } from 'node:crypto';
import { genesisSender } from './data.js';
import * as Util from './util'
import { ec } from 'elliptic';
import * as Interfaces from "./interfaces.js"
import { getUnverifiedTransactionPool, selectRandomTransaction } from './transactionPool.js';
import { guessTxnSecret } from './wallet.js';
import * as CONSTANTS from "./constants"
import * as ZodSchema from './zod';
import { string } from 'zod';

// CONSTANTS

const BLOCK_GENERATION_INTERVAL: number = 60; // Seconds

const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 100 // Blocks

// Initializing elliptic curve using secp256k 1
const ellipticCurve = new ec('secp256k1');

const calculateHash = (
  index: number,
  previousHash: string,
  timestamp: number,
  difficulty: number,
  validator: string,
  data: Interfaces.Transaction
): string => {
  const dataHash = data.txHash;
  return createHash('sha256')
    .update(index + previousHash + timestamp + dataHash + difficulty + validator)
    .digest('hex');
};

const calculateHashForBlock = (block: Interfaces.Block): string => {
  const hash = calculateHash(block.blockIndex, block.prevBlockHash, block.timestamp, block.difficulty, block.validator, block.transaction); /// -> For now the block hash is calculated only using the first transaction just to deal with any errors for now
  return hash;
}

export function getLatestBlock(): Interfaces.Block {
  const b: Interfaces.Blockchain = Util.readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;
  //@ts-ignore
  return b.blocks[0] as Interfaces.Block; /// Reminder: -> Theres an error because ts thinks b could be undefined, but the readFile function should always return a blockchain with the genesis block(If no transaction exists)
}

const isValidChain = (blockchain: Interfaces.Blockchain): boolean => {
  const isValidGenesis = (block: Interfaces.Block | undefined): boolean => {
    if (!block) return false;
    return JSON.stringify(block) === JSON.stringify(CONSTANTS.genesisBlock);
  };

  if (!isValidGenesis(blockchain.blocks[0])) {
    return false;
  }

  const blockChainStateVerified: boolean = verifyBlockchainState();

  for (let i = 1; i < blockchain.blocks.length; i++) {
    const currentBlock = blockchain.blocks[i];
    const prevBlock = blockchain.blocks[i - 1];

    if (!currentBlock || !prevBlock) return false;

    if (!Util.verifyBlock(currentBlock, prevBlock)) {
      return false;
    }
  }

  return (true && blockChainStateVerified);
};


export const replaceChain = (newChain: Interfaces.Blockchain) => {
  ZodSchema.BlockchainSchema.parse(newChain);
  const localBlockchain: ZodSchema.Blockchain = Util.readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;

  if (isValidChain(newChain) && newChain.blocks.length > localBlockchain.blocks.length
    && localBlockchain.blocks.length === localBlockchain.state.chainLength
    && localBlockchain.state.cumulativeDifficulty < newChain.state.cumulativeDifficulty) {
    console.log('Recieved blockchain is valid. Replacing current blockchain with received blockchain');
    Util.writeFile(CONSTANTS.BLOCKCHAIN_PATH, newChain, "BD");
    // broadcastLatest(); I can't remember what this function was supposed to do
  } else {
    console.log('Received blockchain is invalid');
  }
}

export const verifyBlockchainState = (): boolean => {
  const bC: ZodSchema.Blockchain = Util.readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;
  const bCS: ZodSchema.BlockchainState = bC.state;
  ZodSchema.BlockchainSchema.parse(bC);
  ZodSchema.BlockchainStateSchema.parse(bCS);
  const lengthValid: boolean = bCS.chainLength > 0 && bCS.chainLength === bC.blocks.length;
  const sizeValid: boolean = (bCS.chainSize / bCS.chainLength) > 0;
  const rootValid: boolean = Util.verifyBlockRoot(bC.stateRoot);
  return (lengthValid && sizeValid && rootValid);
}

export const updateChain = (newBlock: Interfaces.Block): void => {
  ZodSchema.BlockSchema.parse(newBlock);
  const localBlockchain: ZodSchema.Blockchain = Util.readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;
  ZodSchema.BlockchainSchema.parse(localBlockchain);

  /// Check that block doesn't already exist;
  const blockExist: boolean = localBlockchain.blocks.some((x) => (x.currentBlockHash === newBlock.currentBlockHash) || (x.validator === newBlock.validator) || (x.timestamp === newBlock.timestamp && x.transaction.txHash === newBlock.transaction.txHash));
  if (blockExist) {
    throw new Error("Cannot update chain, the block already exists!");
  }
  if (Util.verifyBlock(newBlock, localBlockchain.blocks[localBlockchain.state.chainLength - 1] as Interfaces.Block)) {
    console.log('Recieved blockchain is valid. Replacing current blockchain with received blockchain...');
    /// Functions to update the blockchain state
    if (Util.verifyBlockRoot(localBlockchain.stateRoot)) {
      const updatedChain = localBlockchain;
      updatedChain.blocks = [...localBlockchain.blocks, newBlock];
      updatedChain.stateRoot = Util.updateBlockRoot(localBlockchain.stateRoot, newBlock.currentBlockHash);
      updatedChain.state.cumulativeDifficulty = localBlockchain.state.cumulativeDifficulty + newBlock.difficulty;
      updatedChain.state.chainLength = localBlockchain.state.chainLength + 1;
      ///TODO: -> I've not yet implemented a way to calculate the size of each block.
      ZodSchema.BlockchainSchema.parse(updateChain);
      Util.writeFile(CONSTANTS.BLOCKCHAIN_PATH, updatedChain, "BD");
      const uTD = Util.readFile(CONSTANTS.UNVERIFIED_TRANSACTIONS_PATH, "UTP") as Interfaces.UnverifiedTransactionPoolInterface;
      // Remove the transaction that was just added in the new block
      uTD.pool = uTD.pool.filter(tx => tx.txHash !== newBlock.transaction.txHash);
      Util.writeFile(CONSTANTS.UNVERIFIED_TRANSACTIONS_PATH, uTD, "UTP");
    } else {
      throw new Error("Your current local blockchain is invalid");
      /// NOTE: -> This functiion should probably query the network to update it's blockchain data if the local blockchain is invalid.
    };
  } else {
    console.log('Received blockchain is invalid');
  }
}

const getCurrentTimestamp = (): number => {
  const blockchain: Interfaces.Blockchain = Util.readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;
  ZodSchema.BlockchainSchema.parse(blockchain);
  let latestBlock: Interfaces.Block = blockchain.blocks[blockchain.blocks.length - 1]!;
  return latestBlock.timestamp;
}

// const findBlock = (index: number, previousHash: string, data: Transaction | NFT, difficulty: number ): Block => {
//     let pastTimestamp: number = 0;
//     while (true) {
//         let timestamp: number = getCurrentTimestamp();
//         if(pastTimestamp !== timestamp) {
//             let hash: string = calculateHash(index, previousHash, timestamp, difficulty, getPublicFromWallet(), getAccountBalance(), data);
//             if (isBlockStakingValid(previousHash, getPublicFromWallet(), timestamp, getAccountBalance(), difficulty, index)) {
//                 return new Block(index, hash, previousHash, timestamp, difficulty, getAccountBalance(), getPublicFromWallet(), data);
//             }
//             pastTimestamp = timestamp; 
//         }
//     }
// };

export const getDifficulty = (): number => {
  const blockchain: Interfaces.Blockchain = Util.readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;
  if (!blockchain || blockchain.blocks.length === 0) {
    throw new Error("Blockchain is empty"); /// -> This should theoretically never run
  }

  const latestBlock: Interfaces.Block = blockchain.blocks[blockchain.blocks.length - 1]!; /// Reminder: -> I'm just now realising that I had already defined a function for this, SMH

  if (latestBlock.blockIndex % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.blockIndex !== 0) {
    const output: number = getAdjustedDifficulty(latestBlock, blockchain);
    if (output < CONSTANTS.MIN_DIFFICULTY) return CONSTANTS.MIN_DIFFICULTY;
    if (output > CONSTANTS.MAX_DIFFICULTY) return CONSTANTS.MAX_DIFFICULTY;
    return Math.ceil(output);
  } else {
    return latestBlock.difficulty;
  }
};


const getAdjustedDifficulty = (latestBlock: Interfaces.Block, blockchain: Interfaces.Blockchain): number => {
  const prevAdjustmentBlock: Interfaces.Block = blockchain.blocks[blockchain.blocks.length - DIFFICULTY_ADJUSTMENT_INTERVAL]!;
  const timeExpected: number = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
  const timeTaken: number = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
  if (timeTaken < timeExpected / 2) {
    return prevAdjustmentBlock.difficulty + 1;
  } else if (timeTaken > timeExpected * 2) {
    return prevAdjustmentBlock.difficulty - 1;
  } else {
    return prevAdjustmentBlock.difficulty
  }
};

const signTx = (txHash: string, privKeyHex: string): Interfaces.Signature => {
  const key = ellipticCurve.keyFromPrivate(privKeyHex, 'hex');
  const signature = key.sign(txHash, { canonical: true });

  return {
    r: signature.r.toString(16),
    s: signature.s.toString(16),
  };
};

const verifyTxSignature = (txHash: string, publicKeyHex: string, signature: { r: string, s: string }): boolean => {
  const key = ellipticCurve.keyFromPublic(publicKeyHex, 'hex');
  return key.verify(txHash, signature);
};

const verifyTxHash = (transaction: Interfaces.Transaction): boolean => {
  let storedTxHash: string = transaction.txHash;
  let calculatedTxHash: string = calculateHashForTransaction(transaction.sender, transaction.recipient, transaction.token, transaction.value, transaction.gasfee);
  return storedTxHash === calculatedTxHash;
}

const calculateHashForTransaction = (sender: Interfaces.AddressInterface, recipient: Interfaces.AddressInterface, token: Interfaces.Token, value: number, gasfee: number): string => {
  const result: string = createHash('sha256').update(sender.publicKeyHex + recipient.publicKeyHex + token.tokenId + value + gasfee).digest('hex');
  return result;
}

/// Mint a block
export const mintBlock = async (): Promise<Interfaces.Block> => {
  const pool = getUnverifiedTransactionPool();
  const transaction = selectRandomTransaction(1, pool) as Interfaces.Transaction;

  if (!Util.verifyTx(transaction, "U")) throw new Error("Invalid Transaction selected from pool");

  const guessedTxnSecret: string = await guessTxnSecret(transaction.txSecretDiff, transaction.txSecret);

  const prevBlock = getLatestBlock();
  const nextIndex = prevBlock.blockIndex + 1;
  const timestamp = Date.now() / 1000;

  const verifiedTransaction: Interfaces.VerifiedTransaction = {
    ...transaction,
    txSecretSolved: guessedTxnSecret,
    blockIndex: nextIndex
  };

  const walletData: Interfaces.WalletData = Util.readFile(CONSTANTS.WALLET_PATH, "WD") as Interfaces.WalletData;
  ZodSchema.WalletDataSchema.parse(walletData);
  const validator = walletData.accountDetails.address;

  const hash = calculateHash(
    nextIndex,
    prevBlock.currentBlockHash,
    timestamp,
    verifiedTransaction.txSecretDiff,
    validator.publicKeyHex,
    verifiedTransaction
  );

  const newBlock: Interfaces.Block = {
    prevBlockHash: prevBlock.currentBlockHash,
    currentBlockHash: hash,
    blockIndex: nextIndex,
    transaction: verifiedTransaction,
    timestamp: timestamp,
    validator: validator.publicKeyHex,
    difficulty: verifiedTransaction.txSecretDiff
  }

  /// Clean unverified transactions pool
  const uTD: Interfaces.UnverifiedTransactionPoolInterface = Util.readFile(CONSTANTS.UNVERIFIED_TRANSACTIONS_PATH, "UTP") as Interfaces.UnverifiedTransactionPoolInterface;
  ZodSchema.UnverifiedTransactionPoolInterfaceSchema.parse(uTD);

  uTD.pool = uTD.pool.filter(_ => _.txHash !== transaction.txHash);
  Util.writeFile(CONSTANTS.UNVERIFIED_TRANSACTIONS_PATH, uTD, "UTP");
  /// Broadcast newly created block
  Util.broadcastBlock(newBlock);
  return newBlock;
}

