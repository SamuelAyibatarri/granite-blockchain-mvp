import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import * as Interfaces from './interfaces';
import * as ZodSchema from './zod';
import { createHash, randomBytes } from 'node:crypto';
import { ec } from 'elliptic';
import * as CONSTANTS from './constants';
import { verifyTxSignature } from './wallet';
import { write } from 'node:fs';

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
        return ZodSchema.WalletDataSchema.parse(parsedData);
      case "UTP":
        return ZodSchema.UnverifiedTransactionPoolInterfaceSchema.parse(parsedData);
      case "BD":
        return ZodSchema.BlockchainSchema.parse(parsedData);
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

/// Verify Transaction Secret
const verifyTxSecret = (secretHash: string, guess: string): boolean => {
  const guessHash = createHash('sha256').update(guess).digest('hex');
  return guessHash === secretHash;
}

export const updateBlockRoot = (prevRoot: string, newBlockRoot: string): string => {
  if (typeof prevRoot !== "string") throw new Error("prevRoot must be a string");
  if (typeof newBlockRoot !== "string") throw new Error("newBlockRoot must be a string");
  if (prevRoot.length < 15 && newBlockRoot.length < 15) throw new Error("The roots must be invalid as they are less than the normal length");
  const newHash: string = createHash('sha256').update(prevRoot + newBlockRoot).digest("hex");
  return newHash;
}

export const verifyBlockRoot = (rootToVerify: string): boolean => {
  const bC: ZodSchema.Blockchain = readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;
  ZodSchema.BlockchainSchema.parse(bC);
  let result: string = "";
  for (let i = 0; i < bC.blocks.length; i++) {
    if (i === 0) {
      result = bC.blocks[i]?.currentBlockHash ?? "";
      continue;
    }
    result = updateBlockRoot(result, bC.blocks[i]?.currentBlockHash ?? "");
  }
  return (rootToVerify === result);
}

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
        ZodSchema.WalletDataSchema.parse(data);
        break;
      case "UTP":
        ZodSchema.UnverifiedTransactionPoolInterfaceSchema.parse(data);
        break;
      case "BD":
        ZodSchema.BlockchainSchema.parse(data);
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

function genUniqueNonce(): number {
  const timestamp = Date.now();
  const timestampPart = timestamp % 1000000;
  const randomNumber = randomBytes(2).readUInt16BE(0);
  return timestampPart + randomNumber;
}

export const getAccountState = (addressHex: string): { balance: number, lastNonce: number } => {
  if (!checkIfFileExists(CONSTANTS.BLOCKCHAIN_PATH)) throw new Error("Block chain file doesn't exist");
  const blockchain: Interfaces.Blockchain = readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;

  let balance = 0;
  let lastNonce = 0;

  blockchain.blocks.forEach(block => {
    const tx = block.transaction;

    if (tx.recipient.publicKeyHex === addressHex) {
      balance += tx.value;
    }
    if (tx.sender.publicKeyHex === addressHex) {
      balance -= (tx.value + tx.gasfee);

      if (tx.nonce > lastNonce) {
        lastNonce = tx.nonce;
      }
    }
  });

  return { balance, lastNonce };
}

export const verifyTx = (tx: ZodSchema.VerifiedTransaction | ZodSchema.Transaction, txT: "U" | "V"): boolean => { /// "U" -> Unverified , "V" -> Verified
  if (txT === "U") { ZodSchema.TransactionSchema.parse(tx) };
  if (txT === "V") {
    ZodSchema.VerifiedTransactionSchema.parse(tx);
    if (!verifyTxSecret(tx.txSecret, (tx as ZodSchema.VerifiedTransaction).txSecretSolved)) return false;
  };
  if (!verifyTxHash(tx) || !verifyTxSignature(tx.txHash, tx.sender.publicKeyHex, tx.signature)) {
    return false;
  };

  const userState = getAccountState(tx.sender.publicKeyHex);
  if (userState.balance < (tx.value + tx.gasfee) || tx.nonce <= userState.lastNonce) return false;
  return true;
}



export const verifyBlock = (block: ZodSchema.Block, prevBlock: ZodSchema.Block): boolean => {
  ZodSchema.BlockSchema.parse(block);
  const blockChain: Interfaces.Blockchain = readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;
  ZodSchema.BlockSchema.parse(prevBlock);

  if (prevBlock.blockIndex + 1 !== block.blockIndex) {
    console.log('Invalid Index');
    return false;
  } else if (prevBlock.currentBlockHash !== block.prevBlockHash) {
    console.log('invalid previoushash');
    return false;
  } else if (calculateHashForBlock(block) !== block.currentBlockHash) {
    console.log(typeof (block.currentBlockHash) + '' + typeof calculateHashForBlock(block));
    console.log('invalid hash; ' + calculateHashForBlock(block) + '' + block.currentBlockHash);
    return false;
  }

  if (!verifyTx(block.transaction, "V")) return false;
  return true;
}

export function getLatestBlock(): Interfaces.Block {
  const b: Interfaces.Blockchain = readFile(CONSTANTS.BLOCKCHAIN_PATH, "BD") as Interfaces.Blockchain;
  //@ts-ignore
  return b.blocks[0] as Interfaces.Block; /// Reminder: -> Theres an error because ts thinks b could be undefined, but the readFile function should always return a blockchain with the genesis block(If no transaction exists)
}

export const broadcastBlock = (newBlock: Interfaces.Block): void => {
  ZodSchema.BlockSchema.parse(newBlock);
  const broadcastPromises = CONSTANTS.PEERS.map(async (peerUrl) => {
    try {
      const response = await fetch(`${peerUrl}/receiveBlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newBlock),
      })

      if (!response.ok) {
        console.log(`Peer ${peerUrl} rejected the block.`)
      }
    } catch (error) {
      console.log("Failed to broadcast block.");
      if (error instanceof Error) {
        console.error(`Error: ${error}`);
      }
    }
  })
}
