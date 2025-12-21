// import CryptoJS from 'crypto-js';
import { createHash } from 'node:crypto';
import { genesisSender } from './data.js';
import * as Util from './util'
import { ec } from 'elliptic';
import type * as Interfaces from './interfaces.ts'
import { getUnverifiedTransactionPool, selectRandomTransaction } from './transactionPool.js';
import { guessTxnSecret } from './wallet.js';
import * as CONSTANTS from "./constants"

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

export const isValidNewBlock = (newBlock: Interfaces.Block, previousBlock: Interfaces.Block): boolean => {

  if (previousBlock.blockIndex + 1 !== newBlock.blockIndex) {
    console.log('Invalid Index');
    return false;
  } else if (previousBlock.currentBlockHash !== newBlock.prevBlockHash) {
    console.log('invalid previoushash');
    return false;
  } else if (calculateHashForBlock(newBlock) !== newBlock.currentBlockHash) {
    console.log(typeof (newBlock.currentBlockHash) + '' + typeof calculateHashForBlock(newBlock));
    console.log('invalid hash; ' + calculateHashForBlock(newBlock) + '' + newBlock.currentBlockHash);
    return false;
  }
  return true;
};


const isValidChain = (blockchainToValidate: Interfaces.Block[]): boolean => {
  const isValidGenesis = (block: Interfaces.Block | undefined): boolean => {
    if (!block) return false;
    return JSON.stringify(block) === JSON.stringify(CONSTANTS.genesisBlock);
  };

  if (!isValidGenesis(blockchainToValidate[0])) {
    return false;
  }

  for (let i = 1; i < blockchainToValidate.length; i++) {
    const currentBlock = blockchainToValidate[i];
    const prevBlock = blockchainToValidate[i - 1];

    if (!currentBlock || !prevBlock) return false;

    if (!isValidNewBlock(currentBlock, prevBlock)) {
      return false;
    }
  }

  return true;
};


// const replaceChain = (newBlocks: Block[]) => {
//     if (isValidChain(newBlocks) && newBlocks.length > getBlockchain().length) {
//         console.log('Recieved blockchain is valid. Replacing current blockchain with received blockchain');
//         blockchain = newBlocks;
//         broadcastLatest();
//     } else {
//         console.log('Received blockchain is invalid');
//     }
// }

const getCurrentTimestamp = (): number => {
  const blockchain: Interfaces.Blockchain = Util.readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;
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

const getDifficulty = (): number => {
  const blockchain: Interfaces.Blockchain = Util.readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;
  if (!blockchain || blockchain.blocks.length === 0) {
    throw new Error("Blockchain is empty"); /// -> This should theoretically never run
  }

  const latestBlock: Interfaces.Block = blockchain.blocks[blockchain.blocks.length - 1]!; /// Reminder: -> I'm just now realising that I had already defined a function for this, SMH

  if (latestBlock.blockIndex % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.blockIndex !== 0) {
    return getAdjustedDifficulty(latestBlock, blockchain);
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

/// Verify Transaction
const verifyTx = (transaction: Interfaces.Transaction): boolean => {
  if (!verifyTxHash(transaction) || !verifyTxSignature(transaction.txHash, transaction.sender.publicKeyHex, transaction.signature)) {
    return false;
  };

  const userBalanceFromLocalDB = Util.getUserBalanceFromLocalBC(transaction.sender.publicKeyHex);
  if (userBalanceFromLocalDB < (transaction.value + transaction.gasfee)) return false;

  return true
}

/// Mint a block
export const mintBlock = async (): Promise<Interfaces.Block> => {
  const pool = getUnverifiedTransactionPool();
  const transaction = selectRandomTransaction(1, pool) as Interfaces.Transaction;

  if (!verifyTx(transaction)) throw new Error("Invalid Transaction selected from pool");

  const guessedTxnSecret: string = await guessTxnSecret(transaction.txSecretDiff, transaction.txSecret);

  const prevBlock = getLatestBlock();
  const nextIndex = prevBlock.blockIndex + 1;
  const timestamp = Date.now() / 1000;

  const verifiedTransaction: Interfaces.VerifiedTransaction = {
    ...transaction,
    txSecretSolved: guessedTxnSecret,
    blockIndex: nextIndex
  };

  const validator = genesisSender; /// Should be the current node address not miner, I'll add the update later

  const hash = calculateHash(
    nextIndex,
    prevBlock.currentBlockHash,
    timestamp,
    7, /// Difficulty (hardcoded for now, it should be the same value as transaction difficulty)
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
    difficulty: 7 /// hardcoded for now
  }

  return newBlock;
}
