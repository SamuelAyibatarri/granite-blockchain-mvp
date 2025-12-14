import { Hono } from 'hono';
import { readFile, checkIfFileExists, checkIfFileIsEmpty } from './util'
import { BLOCKCHAIN_PATH, WALLET_PATH } from './constants';
import * as Interfaces from './interfaces'

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
    delete (d as { accountDetails? : {}}).accountDetails /// delete any sensitive data before sending it
    return (d.transactionHistory) /// extra check to make sure that sensitive data is not sent
}
/// :::::::::::::: Blockchain Network Endpoints :::::::::::::::::

/// get blockchain
app.get('/blocks', async (c) => {
    try {
        const d = await getLocalBlockchainData();
        return c.json({success: true, data: d}, 200)
    } catch (error) {
        if (error instanceof Error) return c.json({success: false, error: error.message}, 500);
        return c.json({success: false, error: error})
    }
});

/// get user transaction history 
app.get('/transactions', async (c) => {
    try {
        const d = await getLocalTransactionData();
        return c.json({success: true, data: d}, 200)
    } catch (error) {
        if (error instanceof Error) return c.json({success: false, error: error.message}, 500);
        return c.json({success: false, error: error})
    }    
});

/// mint a block
app.post('/mintBlock', async (c) => {

});

/// mint a transaction
app.post('/mintTransaction', async (c) => {

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