import { createHash } from 'node:crypto';
import { diff } from 'node:util';
import BigNumber from 'bignumber.js';
import CryptoJS from 'crypto-js';
import { ec } from 'elliptic';
import type { Signature, Transaction, NFT, NFTMetadata, Token, AddressInterface } from './interfaces.ts'
import type { AddressClass , AccountClass } from './classes.ts';
import { create } from 'node:domain';

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

class Block {
    public index: number;
    public hash: string;
    public previousHash: string;
    public timestamp: number;
    public difficulty: number;
    public nonce: number = Number(`${Date.now}-${Math.floor(Math.random() * 1000000)}`);
    public minterBalance: number;
    public minterAddress: AddressInterface;
    public data: Transaction<AddressInterface>;

    constructor(index: number, hash: string, previousHash: string, timestamp: number, difficulty: number, minterBalance: number, minterAddress: AddressInterface,data: Transaction<AddressInterface>) {
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.difficulty = difficulty;
        this.minterBalance = minterBalance;
        this.minterAddress = minterAddress;
        this.data = data;
    }
}

const genesisSender: AddressInterface = {
    address: 'AD_6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
    balance: 1,
    nonce: Math.random() * 10000  // Don't Forget to change later
};

const genesisReciever: AddressInterface = {
    address: 'AD_d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
    balance: 1,
    nonce: Math.random() * 10000 // Don't forget to change later
};

const genesisTx: Transaction<AddressInterface> = {
    sender: genesisSender,
    recipient: genesisReciever,
    token: NATIVE_TOKEN,
    value: 1,
    gasfee: 1,
    txHash: '',
    signature: {r: '', s: ''}
}
const genesisBlock: Block = new Block(
    0, 'aeebad4a796fcc2e15dc4c6061b45ed9b373f26adfc798ca7d2d8cc58182718e', 'null', 1465154705, 1, 1, genesisSender, genesisTx
);

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
    .update(index + previousHash + timestamp + dataHash + difficulty + minterBalance + minterAddress.address)
    .digest('hex');
};

const calculateHashForBlock  = (block: Block): string => {
    const hash = calculateHash(block.index, block.previousHash, block.timestamp, block.difficulty, block.minterAddress, block.minterBalance, block.data);
    return hash;
}

// This function does nothing for now
function getLatestBlock(): Block {
    const randomTransaction: Transaction<AddressInterface> =  {
  sender: {
    address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    balance: 3.75,
    nonce: 4
  },
  recipient: {
    address: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    balance: 12.89,
    nonce: 6
  },
  token: NATIVE_TOKEN,
  value: 0.15,
  gasfee: 0.0021,
  txHash: "0x4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6",
  signature: {r: '', s: ''}
}
    const randomBlock = new Block(5, '', '', 89,1,1,genesisSender, randomTransaction)
    return randomBlock;
}

const generateNextBlock = (blockData: Transaction<AddressInterface>): Block => {
    const previousBlock: Block = getLatestBlock();
    const nextIndex: number = previousBlock.index + 1;
    const nextTimestamp: number = new Date().getTime() / 1000;
    const nextHash: string = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, 7, genesisSender, genesisSender.balance, blockData);
    const newBlock: Block = new Block(nextIndex, nextHash, previousBlock.hash, nextTimestamp,7,genesisSender.balance, genesisSender, blockData);
    return newBlock;
}

// Block chain would be stored in an array for now I store it in a database later
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

const isBlockStakingValid = (prevhash: string, address: string, timestamp: number, balance:number, difficulty: number, index: number):  boolean => {
    difficulty = difficulty + 1;
    const mintingWithoutCoinIndex: number = 7; // Random Number don't forget to change later

    if(index <= mintingWithoutCoinIndex) {
        balance = balance + 1;
    }

    const balanceOverDifficulty = new BigNumber(2).exponentiatedBy(256).times(balance).dividedBy(difficulty);
    const stakingHash: string = CryptoJS.SHA256(prevhash + address + timestamp).toString();
    const decimalStakingHash = new BigNumber(stakingHash, 16);
    const difference = balanceOverDifficulty.minus(decimalStakingHash).toNumber();
    return difference >= 0;
};

const getCurrentTimestamp = (): number => {
    let latestBlock: Block = blockchain[blockchain.length - 1]!;
    return latestBlock.timestamp;
}

const getDifficulty = (blockchain: Block[]): number => {
    if (!blockchain || blockchain.length === 0) {
        return -1; 
    }

    const latestBlock = blockchain[blockchain.length - 1]!;

    if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
        return getAdjustedDifficulty(latestBlock, blockchain);
    } else {
        return latestBlock.difficulty;
    }
};


const getAdjustedDifficulty= (latestBlock: Block, blockchain: Block[]): number => {
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

const signTxIn = (txHash: string, privKeyHex: string): Signature => {
    const key = ellipticCurve.keyFromPrivate(privKeyHex, 'hex');
    const signature = key.sign(txHash, { canonical: true });

    return {
        r: signature.r.toString(16),
        s: signature.s.toString(16),
    };
};

const verifyTxSignature = (txHash: string, publicKeyHex: string, signature: {r: string, s: string}): boolean => {
    const key = ellipticCurve.keyFromPublic(publicKeyHex, 'hex');
    return key.verify(txHash, signature);
};

const verifyTxHash = (transaction: Transaction<AddressClass>): boolean => {
    let storedTxHash: string = transaction.txHash;
    let calculatedTxHash: string = calculateHashForTransaction(transaction.sender, transaction.recipient, transaction.token, transaction.value, transaction.gasfee);
    return storedTxHash === calculatedTxHash;
}

const calculateHashForTransaction = (sender: AddressClass, recipient: AddressClass, token: Token, value: number, gasfee: number): string => {
    const result: string = createHash('sha256').update(sender.getPublicKeyHex + recipient.getPublicKeyHex + token.tokenId  + value + gasfee).digest('hex');
    return result;
}

const verifyTx = (transaction: Transaction<AddressClass>): boolean => {
    if (!verifyTxHash(transaction) && !verifyTxSignature(transaction.txHash, transaction.sender.getPublicKeyHex, transaction.signature)) {
        return false;
    };
    return true
}
