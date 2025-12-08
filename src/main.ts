// import CryptoJS from 'crypto-js';
import { createHash } from 'node:crypto';
import { genesisReciever, genesisSender, genesisTx, mockTransactionData } from './data.js';
import { diff } from 'node:util';
import * as Util from './util'
import BigNumber from 'bignumber.js';
import CryptoJS from 'crypto-js';
import { ec } from 'elliptic';
import type { Signature, Transaction, Token, AddressInterface, VerifiedTransaction } from './interfaces.ts'
import { AddressClass, AccountClass, Block } from './classes';
import { create } from 'node:domain';
import { getUnverifiedTransactionPool, selectRandomTransaction } from './transactionPool.js';
import { guessTxnSecret } from './wallet.js';

// CONSTANTS

const BLOCK_GENERATION_INTERVAL: number = 60; // Seconds

const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 100 // Blocks

const NATIVE_TOKEN: Token = {
  tokenId: 'd',
  name: 'granite',
  contractAddress: 's',
  ticker: 'gran',
  totalSupply: 1000000000, // 100 Million Native Tokens
  circulatingSupply: 10 // 10 Native Tokens in supply, the balance of the genesis sender and genesis receiver.
};

// Initializing elliptic curve using secp256k 1
const ellipticCurve = new ec('secp256k1');

const genesisBlock: Block = new Block(0, 'aeebad4a796fcc2e15dc4c6061b45ed9b373f26adfc798ca7d2d8cc58182718e', 'null', 1465154705, 1, 1, genesisSender, 'accumulator', mockTransactionData[0]);

const calculateHash = (
  index: number,
  previousHash: string,
  timestamp: number,
  difficulty: number,
  minterAddress: AddressInterface,
  minterBalance: number,
  data: Transaction
): string => {
  const dataHash = data.txHash;
  return createHash('sha256')
    .update(index + previousHash + timestamp + dataHash + difficulty + minterBalance + minterAddress.publicKeyHex)
    .digest('hex');
};

const calculateHashForBlock = (block: Block): string => {
  const hash = calculateHash(block.index, block.previousHash, block.timestamp, block.difficulty, block.minterAddress, block.minterBalance, block.data[0]); /// -> For now the block hash is calculated only using the first transaction just to deal with any errors for now
  return hash;
}

// This function does nothing for now
function getLatestBlock(): Block {
  const randomTransaction: Transaction<AddressInterface> = {
    sender: {
      publicKeyHex: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      balance: 3.75,
      nonce: 4
    },
    recipient: {
      publicKeyHex: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
      balance: 12.89,
      nonce: 6
    },
    token: NATIVE_TOKEN,
    value: 0.15,
    gasfee: 0.0021,
    txHash: "0x4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6",
    signature: { r: '', s: '' },
    txSecret: "8028f4ecd6da3344822baec652d52977973892f8766a6f78a8870f78c24ded51",
    txSecretDiff: 8,
    nonce: 432
  }
  const randomBlock = new Block(5, '', '', 89, 1, 1, genesisSender, 'accumulator', mockTransactionData)
  return randomBlock;
}

const generateNextBlock = (blockData: Transaction): Block => {
  const previousBlock: Block = getLatestBlock();
  const nextIndex: number = previousBlock.index + 1;
  const nextTimestamp: number = new Date().getTime() / 1000;
  const nextHash: string = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, 7, genesisSender, genesisSender.balance, blockData); /// Don't forget to change later, also modify the calculateHash function
  const newBlock: Block = new Block(nextIndex, nextHash, previousBlock.hash, nextTimestamp, 7, genesisSender.balance, genesisSender, "root", blockData);
  return newBlock;
}

// Block chain would be stored in an array for now
let blockchain: Block[] = [genesisBlock];

const isValidNewBlock = (newBlock: Block, previousBlock: Block): boolean => {

  if (previousBlock.index + 1 !== newBlock.index) {
    console.log('Invalid Index');
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    console.log('invalid previoushash');
    return false;
  } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
    console.log(typeof (newBlock.hash) + '' + typeof calculateHashForBlock(newBlock));
    console.log('invalid hash; ' + calculateHashForBlock(newBlock) + '' + newBlock.hash);
    return false;
  }
  return true;
};


const isValidChain = (blockchainToValidate: Block[]): boolean => {
  const isValidGenesis = (block: Block | undefined): boolean => {
    if (!block) return false;
    return JSON.stringify(block) === JSON.stringify(genesisBlock);
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
  let latestBlock: Block = blockchain[blockchain.length - 1]!;
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

const getDifficulty = (blockchain: Block[]): number => {
  if (!blockchain || blockchain.length === 0) {
    return -1; // or throw new Error("Blockchain is empty")
  }

  const latestBlock = blockchain[blockchain.length - 1]!; // always defined now

  if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
    return getAdjustedDifficulty(latestBlock, blockchain);
  } else {
    return latestBlock.difficulty;
  }
};


const getAdjustedDifficulty = (latestBlock: Block, blockchain: Block[]): number => {
  const prevAdjustmentBlock: Block = blockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL]!;
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

const signTx = (txHash: string, privKeyHex: string): Signature => {
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

const verifyTxHash = (transaction: Transaction<AddressInterface>): boolean => {
  let storedTxHash: string = transaction.txHash;
  let calculatedTxHash: string = calculateHashForTransaction(transaction.sender, transaction.recipient, transaction.token, transaction.value, transaction.gasfee);
  return storedTxHash === calculatedTxHash;
}

const calculateHashForTransaction = (sender: AddressInterface, recipient: AddressInterface, token: Token, value: number, gasfee: number): string => {
  const result: string = createHash('sha256').update(sender.publicKeyHex + recipient.publicKeyHex + token.tokenId + value + gasfee).digest('hex');
  return result;
}

/// Verify Transaction
const verifyTx = (transaction: Transaction<AddressInterface>): boolean => {
  if (!verifyTxHash(transaction) || !verifyTxSignature(transaction.txHash, transaction.sender.publicKeyHex, transaction.signature)) {
    return false;
  };

  const userBalanceFromLocalDB = Util.getUserBalanceFromLocalBC(transaction.sender.publicKeyHex);
  if (userBalanceFromLocalDB < (transaction.value + transaction.gasfee)) return false;

  return true
}

/// Mint a block
const mintBlock = async (): Promise<Block> => {
  const pool = getUnverifiedTransactionPool();
  const transaction = selectRandomTransaction(1, pool) as Transaction<AddressInterface>;

  if (!verifyTx(transaction)) throw new Error("Invalid Transaction selected from pool");

  const guessedTxnSecret = await guessTxnSecret(transaction.txSecretDiff, transaction.txSecret);

  const prevBlock = getLatestBlock();
  const nextIndex = prevBlock.index + 1;
  const timestamp = Date.now() / 1000;

  const verifiedTransaction: VerifiedTransaction = {
    ...transaction,
    blockIndex: nextIndex
  };

  const minerAddress = genesisSender; /// Should be the current node address not miner, I'll add the update later
  const minerBalance = Util.getUserBalanceFromLocalBC(minerAddress.publicKeyHex);

  const hash = calculateHash(
    nextIndex,
    prevBlock.hash,
    timestamp,
    7, /// Difficulty (hardcoded for now, it should be the same value as transaction difficulty)
    minerAddress,
    minerBalance,
    verifiedTransaction
  );

  const newBlock = new Block(
    nextIndex,
    hash,
    prevBlock.hash,
    timestamp,
    7,
    minerBalance,
    minerAddress,
    "accumulator-placeholder", /// I'll have to change this since I won't be using the accumulator for this mvp
    verifiedTransaction
  );

  return newBlock;
}
