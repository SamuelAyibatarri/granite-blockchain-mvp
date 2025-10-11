import CryptoJS from 'crypto-js';
import { createHash, randomBytes} from 'node:crypto';
import crypto from 'crypto';
import { ec } from 'elliptic';
import type { AccountInterface, AddressInterface, Transaction, Token, Signature, WalletData } from './interfaces.ts';
import { AccountClass, AddressClass } from './classes.js';
import * as openpgp from 'openpgp';
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import * as path from 'path';
import { read } from 'node:fs';

const ellipticCurve = new ec('secp256k1');

const DEFAULT_BALANCE: number = 0;
const WALLET_PATH: string = "wallet/wallet_data.json";
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

function readFile(filePath: string): WalletData {
    let data: string;
    try {
         data = readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.error("Error reading file: ", error);
        throw error;
    }
    return JSON.parse(data)
}

const signTx = (txHash: string, privKeyHex: string): Signature => {
    const key = ellipticCurve.keyFromPrivate(privKeyHex, 'hex');
    const signature = key.sign(txHash, { canonical: true });

    return {
        r: signature.r.toString(16),
        s: signature.s.toString(16),
    };
};

const calculateHashForTransaction = (sender: AddressInterface, recipient: AddressInterface, token: Token, value: number, gasfee: number): string => {
    const result: string = createHash('sha256').update(sender.publicKeyHex + sender.balance + recipient.publicKeyHex + recipient.balance + token.tokenId  + value + gasfee).digest('hex');
    return result;
}

const verifyTxHash = (transaction: Transaction<AddressInterface>): boolean => {
    let storedTxHash: string = transaction.txHash;
    let calculatedTxHash: string = calculateHashForTransaction(transaction.sender, transaction.recipient, transaction.token, transaction.value, transaction.gasfee);
    return storedTxHash === calculatedTxHash;
}

function writeFile(filePath: string, data: object): void {
    const sData = JSON.stringify(data, null, 2);
    try {
        writeFileSync(filePath, sData, 'utf-8');
    } catch (error) {
        console.error("Error writing file: ", error);
        throw error
    }
}

function checkIfFileExists(filePath: string): boolean {
    try {
        return existsSync(filePath) && statSync(filePath).isFile();
    } catch (error) {
        return false
    }
}

function checkIfFileIsEmpty(filePath: string): boolean {
    if (checkIfFileExists(filePath)) {
        const fileData = readFile(filePath);
        if (Object.keys(fileData).length === 0) {
            return true;
        }
    }
    return false
}

const genKeyPair = () : {privKey: string, pubKey: string} => {
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

function makeTransaction(recipientAddr: AddressInterface, amountToSend: number): Transaction<AddressInterface> {
    const wallet_data = readFile(WALLET_PATH);  
    if (wallet_data.accountDetails.address.balance < amountToSend) {
        throw new Error(`You don't have enough ${NATIVE_TOKEN.name} to make this transaction`)
    } 
    const newSenderBalance = wallet_data.accountDetails.address.balance - amountToSend - GAS_FEE;
    const newReceiverBalance = recipientAddr.balance + amountToSend;
    const transactionHash = calculateHashForTransaction(wallet_data.accountDetails.address, recipientAddr, NATIVE_TOKEN, amountToSend, GAS_FEE);
    const transactionSignature = signTx(transactionHash, wallet_data.accountDetails.privateKeyHex); 
    const transaction: Transaction<AddressInterface> = {
        sender: {
            publicKeyHex: wallet_data.accountDetails.address.publicKeyHex,
            nonce: wallet_data.accountDetails.address.nonce,
            balance: newSenderBalance
        },
        recipient: {
            publicKeyHex: recipientAddr.publicKeyHex,
            balance: newReceiverBalance,
            nonce: recipientAddr.nonce
        },
        token: NATIVE_TOKEN,
        value: amountToSend,
        gasfee: GAS_FEE,
        txHash: transactionHash,
        signature: transactionSignature
    }

    const wallet_data_class = new AddressClass(wallet_data.accountDetails.address.publicKeyHex, wallet_data.accountDetails.address.balance, wallet_data.accountDetails.address.nonce);
    wallet_data_class.updateBalance(newSenderBalance);
    const updated_wallet_data: WalletData = {
        accountDetails: {
        privateKeyHex: wallet_data.accountDetails.privateKeyHex,
        address: {
            publicKeyHex: wallet_data.accountDetails.address.publicKeyHex,
            balance: newSenderBalance,
            nonce: wallet_data.accountDetails.address.nonce
        }
     },
     transactionHistory: {
        TxIN: [...wallet_data.transactionHistory.TxIN],
        TxOut: [...wallet_data.transactionHistory.TxOut, transaction]
     }
    }

    writeFile(WALLET_PATH, updated_wallet_data)

    console.log("This is the transaction data: ",transaction);
    console.log("This is the updated wallet data: ", updated_wallet_data)
    return transaction;
}

const verifyTxSignature = (txHash: string, publicKeyHex: string, signature: {r: string, s: string}): boolean => {
    const key = ellipticCurve.keyFromPublic(publicKeyHex, 'hex');
    return key.verify(txHash, signature);
};

const verifyBalanceFromTransactionHistory = (): boolean => {
    console.log("Checking Transaction History");

    const wallet_data = readFile(WALLET_PATH);
    const wallet_balance = wallet_data.accountDetails.address.balance;

    // Verify transaction hashes
    const unverifiedTransactionsOut = (wallet_data.transactionHistory.TxOut as Transaction<AddressInterface>[]).map(_ => verifyTxHash(_)).filter(_ => _ === false);
    const unverifiedTransactionsIn = (wallet_data.transactionHistory.TxIN as Transaction<AddressInterface>[]).map(_ => verifyTxHash(_) ).filter(_ => _ === false);  

    if (unverifiedTransactionsIn.length > 0 || unverifiedTransactionsOut.length > 0) {
        console.error("Error: You have transactions with unverified transaction hashes and as such your entire transaction history is likely false");
        return false;
    }

    // Verify transaciton signatures
    const unverifiedTransactionsSigOut = (wallet_data.transactionHistory.TxOut as Transaction<AddressInterface>[]).map(_ => verifyTxSignature(_.txHash, _.sender.publicKeyHex, _.signature)).filter(_ => _ === false);
    const unverifiedTransactionsSigIn = (wallet_data.transactionHistory.TxIN as Transaction<AddressInterface>[]).map(_ => verifyTxSignature(_.txHash, _.sender.publicKeyHex, _.signature) ).filter(_ => _ === false);  

    if (unverifiedTransactionsSigIn.length > 0 || unverifiedTransactionsSigOut.length > 0) {
        console.error("Error: You have transactions with unverified transaction hashes and as such your entire transaction history is likely false");
        return false;
    }

    if (wallet_balance == 0 && wallet_data.transactionHistory.TxIN.length === 0) {
        console.error (`Error: Your wallet balance of: ${wallet_balance} ${NATIVE_TOKEN.name} doesn't correspond with your transaction history.`)
        return false;
    }

    const totalTransactionsOut = wallet_data.transactionHistory.TxOut.map(_ => _.value).reduce((sum, curr) => sum + curr, 0) + (wallet_data.transactionHistory.TxOut.length * GAS_FEE);
    const totalTransactionsIn = wallet_data.transactionHistory.TxOut.map(_ => _.value).reduce((sum, curr) => sum + curr, 0);
    

    if (wallet_balance !== totalTransactionsIn - totalTransactionsOut) {
        console.error (`Error: Your wallet balance of: ${wallet_balance} ${NATIVE_TOKEN} doesn't correspond with your transaction history.`)
        return false
    }

    return true;
}

verifyBalanceFromTransactionHistory();
// makeTransaction(testReciever, 50);
