import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import * as Interfaces from './interfaces';
import * as Schemas from './zod'; 
import { createHash, randomBytes } from 'node:crypto';
import { ec } from 'elliptic';
import * as CONSTANTS from './constants';

const ellipticCurve = new ec('secp256k1');

/// Read data from a file
export function readFile(filePath: string, ft: "WD" | "UTP" | "BD"): Interfaces.WalletData | Interfaces.UnverifiedTransactionPoolInterface | Interfaces.Blockchain {
  if (!filePath && typeof (filePath) != "string") throw new Error("Enter a valid file path");
  if (ft != "WD" && ft != "UTP" && ft != "BD") throw new Error("Invalid ft");

  if (!checkIfFileExists(filePath)) throw new Error("No such file exists in the path you specified");
  
  /// Return default empty structures if file is empty
  if (checkIfFileIsEmpty(filePath)) {
    switch (ft) {
      case "WD":
        return {
          accountDetails: {
            privateKeyHex: "",
            address: { publicKeyHex: "", balance: 0, nonce: 0 }
          },
          transactionHistory: { TxIN: [], TxOut: [] }
        } as Interfaces.WalletData;

      case "UTP":
        return { pool: [] } as Interfaces.UnverifiedTransactionPoolInterface;

      case 'BD':
        return {
          blocks: [CONSTANTS.genesisBlock],
          stateRoot: "place-holder-roor",
          state: {
            chainLength: 1,
            chainSize: 1,
            nativeToken: CONSTANTS.NATIVE_TOKEN,
            cumulativeDifficulty: 1,
          }
        } as Interfaces.Blockchain;
      
      default:
        throw new Error("Unreachable default case in empty file check");
    }
  }

  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const parsedData = JSON.parse(fileContent);

    /// Validate the parsed data against the Schema before returning
    switch (ft) {
      case "WD":
        return Schemas.WalletDataSchema.parse(parsedData);
      case "UTP":
        return Schemas.UnverifiedTransactionPoolInterfaceSchema.parse(parsedData);
      case "BD":
        return Schemas.BlockchainSchema.parse(parsedData);
      default:
        throw new Error("Invalid file type provided during validation");
    }

  } catch (error) {
    console.error(`Error reading or validating ${ft} file:`, error);
    throw error;
  }
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

const verifyTxHash = (transaction: Interfaces.Transaction): boolean => {
  let storedTxHash: string = transaction.txHash;
  let calculatedTxHash: string = calculateHashForTransaction(transaction.sender, transaction.recipient, transaction.token, transaction.value, transaction.gasfee);
  return storedTxHash === calculatedTxHash;
}

/// Write to a file
export function writeFile(filePath: string, data: object, ft: "WD" | "UTP" | "BD"): void {
  try {
    switch (ft) {
      case "WD":
        Schemas.WalletDataSchema.parse(data);
        break;
      case "UTP":
        Schemas.UnverifiedTransactionPoolInterfaceSchema.parse(data);
        break;
      case "BD":
        Schemas.BlockchainSchema.parse(data);
        break;
      default:
        throw new Error("Invalid file type provided for writing");
    }

    const sData = JSON.stringify(data, null, 2);
    writeFileSync(filePath, sData, 'utf-8');
    
  } catch (error) {
    console.error(`Error validating or writing ${ft} file: `, error);
    throw error;
  }
}

/// Check if a file exists
export function checkIfFileExists(filePath: string): boolean {
  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch (error) {
    return false
  }
}

/// Check if file is empty
export function checkIfFileIsEmpty(filePath: string,): boolean {
  if (checkIfFileExists(filePath)) {
    const fileData = readFileSync(filePath, "utf-8") ?? "";
    if (fileData.length == 0) return false
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
  const blockchain: Interfaces.Blockchain = readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;
  if (blockchain.blocks.length === 0) throw new Error("The blockchain is empty")
  let balance = 0;
  blockchain.blocks.forEach(block => {
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