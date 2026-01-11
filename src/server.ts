import { Hono } from 'hono';
import * as Util from './util'
import { mintBlock, getLatestBlock, updateChain } from './main';
import { BLOCKCHAIN_PATH, UNVERIFIED_TRANSACTIONS_PATH, WALLET_PATH } from './constants';
import * as Interfaces from './interfaces'
import * as Wallet from "./wallet";
import { success, z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import * as ZodSchema from "./zod";

const app = new Hono();

/// ::::::::: Helpers :::::::::: 

async function getLocalBlockchainData() {
  if (!Util.checkIfFileExists(BLOCKCHAIN_PATH)) throw new Error("Blockchain file does not exist locally");
  if (Util.checkIfFileIsEmpty(BLOCKCHAIN_PATH)) throw new Error("Local blockchain record is empty");
  const d = Util.readFile(BLOCKCHAIN_PATH, "BD");
  return d;
}

async function getLocalTransactionData() {
  if (!Util.checkIfFileExists(WALLET_PATH)) throw new Error("Wallet file does not exist locally");
  if (Util.checkIfFileIsEmpty(WALLET_PATH)) throw new Error("Local transaction record is empty");
  const d = Util.readFile(WALLET_PATH, "WD") as Interfaces.WalletData
  delete (d as { accountDetails?: {} }).accountDetails /// delete any sensitive data before sending it
  return (d.transactionHistory) /// extra check to make sure that sensitive data is not sent
}

async function getLocalUnverifiedTransactionData() {
  if (!Util.checkIfFileExists(UNVERIFIED_TRANSACTIONS_PATH)) throw new Error("Wallet file does not exist locally");
  if (Util.checkIfFileIsEmpty(UNVERIFIED_TRANSACTIONS_PATH)) throw new Error("Local transaction record is empty");
  const d = Util.readFile(UNVERIFIED_TRANSACTIONS_PATH, "UTP") as Interfaces.UnverifiedTransactionPoolInterface
  return (d);
}
/// :::::::::::::: Blockchain Network Endpoints :::::::::::::::::

/// get blockchain
app.get('/blocks', async (c) => {
  try {
    const d = await getLocalBlockchainData();
    return c.json({ success: true, data: d }, 200)
  } catch (error) {
    if (error instanceof Error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: false, error: error })
  }
});

/// get user transaction history 
app.get('/transactions', async (c) => {
  try {
    const d = await getLocalTransactionData();
    return c.json({ success: true, data: d }, 200)
  } catch (error) {
    if (error instanceof Error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: false, error: error })
  }
});

/// receive a minted block
app.post('/receiveBlock', zValidator('json', ZodSchema.BlockSchema), async (c) => { /// Reminder: -> Create a much more robust function to check the schema of the form data, also handle the logic to add the block.
  const formdata = c.req.valid('json');
  try {
    const latestBlock: Interfaces.Block = Util.getLatestBlock();
    ZodSchema.BlockSchema.parse(latestBlock)
    if (Util.verifyBlock(formdata, Util.getLatestBlock())) {
      updateChain(formdata);
      return c.json({ success: true }, 200);
    }
    return c.json({ success: false, error: "Block was invalid" }, 400);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ success: false, error: error.message });
    }
    return c.json({ success: false, error: "An unknown error occurred" });
  }
});

/// mint a transaction
app.post('/mintTransaction', async (c) => {
  const formData: Interfaces.Transaction = await c.req.json();
  const tV: boolean = Wallet.verifyTxHash(formData) && Wallet.verifyTxSignature(formData.txHash, formData.sender.publicKeyHex, formData.signature)
  if (!tV) return c.json({ success: false, error: "Invalid Transaction" }, 400);
  const lTD = await getLocalUnverifiedTransactionData();
  /// Check to ensure transaction doesn't already exist
  const tE: boolean = lTD.pool.some(_ => _.txHash === formData.txHash);
  if (tE) return c.json({ success: false, error: "Transaction already exists" }, 400);
  try {
    lTD.pool.push(formData);
    Util.writeFile(UNVERIFIED_TRANSACTIONS_PATH, lTD, "UTP");
    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof Error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: false, error: "An unknown error occured" }, 500);
  }
})

export default app;

// const initHttpServer = ( myHttpPort: number ) => {
//     const app = express();
//     app.use(bodyParser.json());

//     app.get('/blocks', (req, res) => {
//         res.send(getBlockchain());
//     });
//     app.post('/mintBlock', (req, res) => {
//         const newBlock: Block = generateNextBlock(req.body.data);
//         res.send(newBlock);
//     });
//     app.get('/peers', (req, res) => {
//         res.send(getSockets().map(( s: any ) => s._socket.remoteAddress + ':' + s._socket.remotePort));
//     });
//     app.post('/addPeer', (req, res) => {
//         connectToPeers(req.body.peer);
//         res.send();
//     });

//     app.listen(myHttpPort, () => {
//         console.log('Listening http on port: ' + myHttpPort);
//     });
// };
