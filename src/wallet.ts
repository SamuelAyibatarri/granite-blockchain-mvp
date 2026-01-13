import CryptoJS from 'crypto-js';
import { createHash, randomBytes } from 'node:crypto';
import crypto from 'crypto';
import { ec } from 'elliptic';
import type { AccountInterface, AddressInterface, Transaction, Token, Signature, WalletData, UnverifiedTransactionPoolInterface } from './interfaces.ts';
import { AccountClass, AddressClass } from './classes.js';
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import * as path from 'path';
import { read } from 'node:fs';
import baseX from 'base-x'
import { WALLET_PATH, BLOCKCHAIN_PATH, BASE62, UNVERIFIED_TRANSACTIONS_PATH, MAX_DIFFICULTY, MIN_DIFFICULTY } from './constants.js'
import { readFile, checkIfFileExists, checkIfFileIsEmpty } from './util';
import { getDifficulty } from './main.js';
const ellipticCurve = new ec('secp256k1');

/// CONSTANTS 

const DEFAULT_BALANCE: number = 0;
const CURRENT_DIFFICULTY: number = getDifficulty();
const GAS_FEE: number = 1;
const NATIVE_TOKEN: Token = {
  tokenId: 'd',
  name: 'granite',
  contractAddress: 's',
  ticker: 'gran',
  totalSupply: 1000000000, // 100 Million Native Tokens
  circulatingSupply: 10 // 10 Native Tokens in supply, the balance of the genesis sender and genesis receiver.
};
const testReciever: AddressInterface = {
  publicKeyHex: 'AD_d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
  balance: 1,
  nonce: Math.random() * 10000 // Don't forget to change later
};

/// Sign transactions

const signTx = (txHash: string, privKeyHex: string): Signature => {
  const key = ellipticCurve.keyFromPrivate(privKeyHex, 'hex');
  const signature = key.sign(txHash, { canonical: true });

  return {
    r: signature.r.toString(16),
    s: signature.s.toString(16),
  };
};

const calculateHashForTransaction = (sender: AddressInterface, recipient: AddressInterface, token: Token, value: number, gasfee: number): string => {
  const result: string = createHash('sha256').update(sender.publicKeyHex + sender.balance + recipient.publicKeyHex + recipient.balance + token.tokenId + value + gasfee).digest('hex');
  return result;
}

export const verifyTxHash = (transaction: Transaction): boolean => {
  let storedTxHash: string = transaction.txHash;
  let calculatedTxHash: string = calculateHashForTransaction(transaction.sender, transaction.recipient, transaction.token, transaction.value, transaction.gasfee);
  return storedTxHash === calculatedTxHash;
}

/// Write to a file
function writeFile(filePath: string, data: object): void {
  const sData = JSON.stringify(data, null, 2);
  try {
    writeFileSync(filePath, sData, 'utf-8');
  } catch (error) {
    console.error("Error writing file: ", error);
    throw error
  }
}


/// Generate key pair
const genKeyPair = (): { privKey: string, pubKey: string } => {
  const keyPair = ellipticCurve.genKeyPair();
  const privateKey = keyPair.getPrivate('hex');
  const publicKey = keyPair.getPublic('hex');

  return {
    privKey: privateKey,
    pubKey: publicKey
  }
}

function genUniqueNonce(): number {
  const timestamp = Date.now();
  const timestampPart = timestamp % 1000000;
  const randomNumber = randomBytes(2).readUInt16BE(0);

  return timestampPart + randomNumber;
}

function genWallet(): WalletData {
  const hexKeyPair = genKeyPair();
  const wallet_data: WalletData = {
    accountDetails: {
      privateKeyHex: hexKeyPair.privKey,
      address: {
        publicKeyHex: hexKeyPair.pubKey,
        balance: DEFAULT_BALANCE,
        nonce: genUniqueNonce()
      }
    },
    transactionHistory: {
      TxIN: [],
      TxOut: []
    }
  }

  return wallet_data;
}

function createWallet() {
  const fileExists: boolean = checkIfFileExists(WALLET_PATH);
  const fileIsEmpty: boolean = checkIfFileIsEmpty(WALLET_PATH);
  if (!fileExists || fileIsEmpty) {
    writeFile(WALLET_PATH, genWallet());
    console.log("Wallet created successfully")
    return;
  }
  console.error("Wallet could not be created because it already exists!")
  return;
}

export const makeTransaction = (recipientAddr: AddressInterface, amountToSend: number): Transaction => {
  const wallet_data = readFile(WALLET_PATH, "WD") as WalletData;
  const unverified_transactions_pool = readFile(UNVERIFIED_TRANSACTIONS_PATH, "UTP") as UnverifiedTransactionPoolInterface;
  if (wallet_data.accountDetails.address.balance < amountToSend) {
    throw new Error(`You don't have enough ${NATIVE_TOKEN.name} to make this transaction`)
  }
  const newSenderBalance = wallet_data.accountDetails.address.balance - amountToSend - GAS_FEE;
  const senderData = {
    publicKeyHex: wallet_data.accountDetails.address.publicKeyHex,
    nonce: wallet_data.accountDetails.address.nonce, // Current Nonce
    balance: newSenderBalance // New Balance
  };
  const newReceiverBalance = recipientAddr.balance + amountToSend;
  const transactionHash = calculateHashForTransaction(senderData, recipientAddr, NATIVE_TOKEN, amountToSend, GAS_FEE);
  const transactionSignature = signTx(transactionHash, wallet_data.accountDetails.privateKeyHex);
  const transaction: Transaction = {
    sender: senderData,
    recipient: {
      publicKeyHex: recipientAddr.publicKeyHex,
      balance: newReceiverBalance,
      nonce: recipientAddr.nonce
    },
    token: NATIVE_TOKEN,
    value: amountToSend,
    gasfee: GAS_FEE,
    txHash: transactionHash,
    signature: transactionSignature,
    txSecret: generateTxnSecret(CURRENT_DIFFICULTY),
    txSecretDiff: CURRENT_DIFFICULTY,
    nonce: wallet_data.accountDetails.address.nonce,
  }

  const wallet_data_class = new AddressClass(wallet_data.accountDetails.address.publicKeyHex, wallet_data.accountDetails.address.balance, wallet_data.accountDetails.address.nonce);
  wallet_data_class.updateBalance(newSenderBalance);
  const updated_wallet_data: WalletData = {
    accountDetails: {
      privateKeyHex: wallet_data.accountDetails.privateKeyHex,
      address: {
        publicKeyHex: wallet_data.accountDetails.address.publicKeyHex,
        balance: newSenderBalance,
        nonce: wallet_data.accountDetails.address.nonce + 1
      }
    },
    transactionHistory: {
      TxIN: [...wallet_data.transactionHistory.TxIN],
      TxOut: [...wallet_data.transactionHistory.TxOut, transaction]
    }
  }

  unverified_transactions_pool.pool.push(transaction) /// update the transaction pool;

  writeFile(WALLET_PATH, updated_wallet_data)
  writeFile(UNVERIFIED_TRANSACTIONS_PATH, unverified_transactions_pool)

  return transaction;
}

export const verifyTxSignature = (txHash: string, publicKeyHex: string, signature: { r: string, s: string }): boolean => {
  const key = ellipticCurve.keyFromPublic(publicKeyHex, 'hex');
  return key.verify(txHash, signature);
};

const verifyBalanceFromTransactionHistory = (): boolean => {
  console.log("Checking Transaction History");

  const wallet_data = readFile(WALLET_PATH, "WD") as WalletData;
  const wallet_balance = wallet_data.accountDetails.address.balance;

  /// Verify transaction hashes
  const unverifiedTransactionsOut = (wallet_data.transactionHistory.TxOut as Transaction[]).map(_ => verifyTxHash(_)).filter(_ => _ === false);
  const unverifiedTransactionsIn = (wallet_data.transactionHistory.TxIN as Transaction[]).map(_ => verifyTxHash(_)).filter(_ => _ === false);

  if (unverifiedTransactionsIn.length > 0 || unverifiedTransactionsOut.length > 0) {
    console.error("Error: You have transactions with unverified transaction hashes and as such your entire transaction history is likely false");
    return false;
  }

  // Verify transaciton signatures
  const unverifiedTransactionsSigOut = (wallet_data.transactionHistory.TxOut as Transaction[]).map(_ => verifyTxSignature(_.txHash, _.sender.publicKeyHex, _.signature)).filter(_ => _ === false);
  const unverifiedTransactionsSigIn = (wallet_data.transactionHistory.TxIN as Transaction[]).map(_ => verifyTxSignature(_.txHash, _.sender.publicKeyHex, _.signature)).filter(_ => _ === false);

  if (unverifiedTransactionsSigIn.length > 0 || unverifiedTransactionsSigOut.length > 0) {
    console.error("Error: You have transactions with unverified transaction hashes and as such your entire transaction history is likely false");
    return false;
  }

  if (wallet_balance == 0 && wallet_data.transactionHistory.TxIN.length === 0) {
    console.error(`Error: Your wallet balance of: ${wallet_balance} ${NATIVE_TOKEN.name} doesn't correspond with your transaction history.`)
    return false;
  }

  const totalTransactionsOut = wallet_data.transactionHistory.TxOut.map(_ => _.value).reduce((sum, curr) => sum + curr, 0) + (wallet_data.transactionHistory.TxOut.length * GAS_FEE);
  const totalTransactionsIn = wallet_data.transactionHistory.TxOut.map(_ => _.value).reduce((sum, curr) => sum + curr, 0);


  if (wallet_balance !== totalTransactionsIn - totalTransactionsOut) {
    console.error(`Error: Your wallet balance of: ${wallet_balance} ${NATIVE_TOKEN} doesn't correspond with your transaction history.`)
    return false
  }

  return true;
}

const getAccountBalance = (): number | undefined => {
  const wallet_data = readFile(WALLET_PATH, "WD") as WalletData;
  const walletVerified = verifyBalanceFromTransactionHistory();
  if (!walletVerified) {
    console.error("Your account balance could not be verified")
    return
  }
  return wallet_data.accountDetails.address.balance
}

/// Create a secret for a transaction
export const generateTxnSecret = (difficulty: number): string => {
  const base52 = baseX(BASE62);
  if (difficulty > MAX_DIFFICULTY || difficulty < MIN_DIFFICULTY) throw new Error("Invalid difficulty");
  const trailingZeros: string = '0'.repeat((MAX_DIFFICULTY + 1) - difficulty);
  const str: string = base52.encode(randomBytes(13));
  const truncated: string = str.slice(0, difficulty);
  const secret: string = trailingZeros + truncated;
  const result: string = createHash('sha256').update(secret).digest('hex');
  return result
}

/// Guess transaction secret
export const guessTxnSecret = async (difficulty: number, secretHash: string): Promise<string> => {
  if (difficulty > MAX_DIFFICULTY || difficulty < MIN_DIFFICULTY)
    throw new Error("Invalid difficulty");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const trailingZeros = "0".repeat((MAX_DIFFICULTY + 1) - difficulty);

  while (true) {
    let s = "";
    for (let i = 0; i < difficulty; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const secret = trailingZeros + s;
    console.log("guess: ", secret)
    const guess = createHash("sha256").update(secret).digest("hex");
    if (guess === secretHash) {
      console.log("Correct guess:", secret);
      return secret;
    }
  }
};

/// Verify transaction secret guess
const verifyTxSecret = (secretHash: string, guess: string): boolean => {
  const guessHash = createHash('sha256').update(guess).digest('hex');
  return guessHash === secretHash;
}


// verifyBalanceFromTransactionHistory();
makeTransaction(testReciever, 50);
// console.log("Is user balance correct?: ", verifyBalanceFromTransactionHistory());
// generateTxnSecret(4);
// guessTxnSecret(4,"935aee836cfee766db9a51db08046d3f721f2553a593ff92dd2466f7e682626a") /// secret to find -> 000000000000052Dq
