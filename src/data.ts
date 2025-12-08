import { NATIVE_TOKEN } from './constants'
import type { AddressInterface, Transaction, TransactionData } from './interfaces'

export const genesisSender: AddressInterface = {
  publicKeyHex: 'AD_6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
  balance: 1,
  nonce: Math.random() * 10000
}

export const genesisReciever: AddressInterface = {
  publicKeyHex: 'AD_d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
  balance: 1,
  nonce: Math.random() * 10000
}

export const genesisTx: Transaction<AddressInterface> = {
  sender: genesisSender,
  recipient: genesisReciever,
  token: NATIVE_TOKEN,
  value: 1,
  gasfee: 1,
  txHash: '',
  signature: { r: '', s: '' },
  txSecret: '8028f4ecd6da3344822baec652d52977973892f8766a6f78a8870f78c24ded51',
  txSecretDiff: 8,
  nonce: 120
}

export const mockTransactionData: TransactionData = [
  genesisTx,
  {
    sender: { publicKeyHex: 'AD_a1b2c3d4e5f6', balance: 100, nonce: 123 },
    recipient: { publicKeyHex: 'AD_f6e5d4c3b2a1', balance: 50, nonce: 456 },
    token: NATIVE_TOKEN,
    value: 25,
    gasfee: 1,
    txHash: '',
    signature: { r: '', s: '' },
    txSecret: '11aa22bb33cc44dd55ee66ff77gg88hh',
    txSecretDiff: 5,
    nonce: 344
  },
  {
    sender: { publicKeyHex: 'AD_abcdef123456', balance: 500, nonce: 789 },
    recipient: { publicKeyHex: 'AD_654321fedcba', balance: 300, nonce: 321 },
    token: NATIVE_TOKEN,
    value: 40,
    gasfee: 2,
    txHash: '',
    signature: { r: '', s: '' },
    txSecret: '99887766554433221100ffeeccbbddaa',
    txSecretDiff: 9,
    nonce: 123
  },
  {
    sender: { publicKeyHex: 'AD_111122223333', balance: 250, nonce: 987 },
    recipient: { publicKeyHex: 'AD_999988887777', balance: 150, nonce: 654 },
    token: NATIVE_TOKEN,
    value: 10,
    gasfee: 1,
    txHash: '',
    signature: { r: '', s: '' },
    txSecret: 'aabbccddeeff00112233445566778899',
    txSecretDiff: 3,
    nonce: 890
  },
  {
    sender: { publicKeyHex: 'AD_ff00ee11dd22', balance: 75, nonce: 222 },
    recipient: { publicKeyHex: 'AD_33cc44bb55aa', balance: 60, nonce: 333 },
    token: NATIVE_TOKEN,
    value: 5,
    gasfee: 1,
    txHash: '',
    signature: { r: '', s: '' },
    txSecret: '00112233445566778899aabbccddeeff',
    txSecretDiff: 7,
    nonce: 890
  }
]

