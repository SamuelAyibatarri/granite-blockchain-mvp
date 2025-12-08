import { Hono } from 'hono';

const app = new Hono();

/// :::::::::::::: Blockchain Network Endpoints :::::::::::::::::

/// get blockchain
app.get('/blocks', async (c) => {
    
});

/// get user transaction history 
app.get('/transactions', async (c) => {
    
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