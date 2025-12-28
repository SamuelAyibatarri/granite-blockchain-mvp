import { Hono } from 'hono';
import { readFile, checkIfFileExists, checkIfFileIsEmpty, writeFile } from './util'
import { mintBlock, isValidNewBlock, getLatestBlock } from './main';
import { BLOCKCHAIN_PATH, UNVERIFIED_TRANSACTIONS_PATH, WALLET_PATH } from './constants';
import * as Interfaces from './interfaces'
import * as Wallet from "./wallet";

const app = new Hono();

/// ::::::::: Helpers :::::::::: 

async function getLocalBlockchainData() {
  if (!checkIfFileExists(BLOCKCHAIN_PATH)) throw new Error("Blockchain file does not exist locally");
  if (checkIfFileIsEmpty(BLOCKCHAIN_PATH)) throw new Error("Local blockchain record is empty");
  const d = readFile(BLOCKCHAIN_PATH, "BD");
  return d;
}

async function getLocalTransactionData() {
  if (!checkIfFileExists(WALLET_PATH)) throw new Error("Wallet file does not exist locally");
  if (checkIfFileIsEmpty(WALLET_PATH)) throw new Error("Local transaction record is empty");
  const d = readFile(WALLET_PATH, "WD") as Interfaces.WalletData
  delete (d as { accountDetails?: {} }).accountDetails /// delete any sensitive data before sending it
  return (d.transactionHistory) /// extra check to make sure that sensitive data is not sent
}

async function getLocalUnverifiedTransactionData() {
  if (!checkIfFileExists(UNVERIFIED_TRANSACTIONS_PATH)) throw new Error("Wallet file does not exist locally");
  if (checkIfFileIsEmpty(UNVERIFIED_TRANSACTIONS_PATH)) throw new Error("Local transaction record is empty");
  const d = readFile(UNVERIFIED_TRANSACTIONS_PATH, "UTP") as Interfaces.UnverifiedTransactionPoolInterface
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

/// mint a block, receive a minted block
app.post('/mintBlock', async (c) => { /// Reminder: -> Create a much more robust function to check the schema of the form data, also handle the logic to add the block.
  const formdata = await c.req.json();
  if (!formdata || typeof formdata.blockIndex === 'undefined') {
    return c.json({ success: false, message: "Invalid block format" }, 400);
  }
  try {
    const newBlock: Interfaces.Block = await mintBlock();

  } catch (error) {

  }

});

/// mint a transaction
app.post('/mintTransaction', async (c) => {
  const formData: Interfaces.Transaction = await c.req.json();
  const tV: boolean = Wallet.verifyTxHash(formData) && Wallet.verifyTxSignature(formData.txHash, formData.sender.publicKeyHex, formData.signature)
  if (!tV) return c.json({success: false, error: "Invalid Transaction"}, 400);
  const lTD = await getLocalUnverifiedTransactionData();
  /// Check to ensure transaction doesn't already exist
  const tE: boolean = lTD.pool.some(_ => _.txHash === formData.txHash);
  if (tE) return c.json({success: false, error: "Transaction already exists"}, 400);
  try {
    lTD.pool.push(formData);
    writeFile(UNVERIFIED_TRANSACTIONS_PATH, lTD);
  } catch (error) {
   if (error instanceof Error) return c.json({success: false, error: error.message}, 500);
   return c.json({success: false, error: "An unknown error occured"}, 500); 
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
