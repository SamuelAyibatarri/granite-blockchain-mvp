import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import * as Interfaces from './interfaces';
import { createHash, randomBytes } from 'node:crypto';
import { ec } from 'elliptic'
import * as CONSTANTS from './constants'
import { Block } from './interfaces';

const ellipticCurve = new ec('secp256k1');

/// Read data from a file
export function readFile(filePath: string): Interfaces.WalletData | Interfaces.UnverifiedTransactionPoolInterface | Interfaces.Block[] {
  let data: string;
  try {
    data = readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error("Error reading file: ", error);
    throw error;
  }
  return JSON.parse(data)
}

/// Sign transactions

export const signTx = (txHash: string, privKeyHex: string): Interfaces.Signature => {
  const key = ellipticCurve.keyFromPrivate(privKeyHex, 'hex');
  const signature = key.sign(txHash, { canonical: true });

  return {
    r: signature.r.toString(16),
    s: signature.s.toString(16),
  };
};

const calculateHashForTransaction = (sender: Interfaces.AddressInterface, recipient: Interfaces.AddressInterface, token: Interfaces.Token, value: number, gasfee: number): string => {
  const result: string = createHash('sha256').update(sender.publicKeyHex + sender.balance + recipient.publicKeyHex + recipient.balance + token.tokenId + value + gasfee).digest('hex');
  return result;
}

const verifyTxHash = (transaction: Interfaces.Transaction<Interfaces.AddressInterface>): boolean => {
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


/// Check if a file exists
function checkIfFileExists(filePath: string): boolean {
  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch (error) {
    return false
  }
}

/// Check if file is empty
function checkIfFileIsEmpty(filePath: string): boolean {
  if (checkIfFileExists(filePath)) {
    const fileData = readFile(filePath);
    if (Object.keys(fileData).length === 0) {
      return true;
    }
  }
  return false
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

export const getUserBalanceFromLocalBC = (senderPublicKeyHex: string): number => {
  if (!checkIfFileExists(CONSTANTS.BLOCKCHAIN_PATH)) throw new Error("Block chain file doesn't exist");
  const blockchain: Block[] = readFile(CONSTANTS.BLOCKCHAIN_PATH) as Block[];
  if (blockchain.length === 0) throw new Error("The blockchain is empty")
  let balance = 0;
  blockchain.forEach(block => {
    const tx = block.transaction;

    if (tx.recipient.publicKeyHex === senderPublicKeyHex) {
      balance += tx.value;
    }

    if (tx.sender.publicKeyHex === senderPublicKeyHex) {
      balance -= (tx.value + tx.gasfee);
    }
  });
  return balance;
}
