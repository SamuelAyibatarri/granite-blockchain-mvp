import { NATIVE_TOKEN } from './constants'
import type { AddressInterface, VerifiedTransaction } from './interfaces'

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

export const genesisTx: VerifiedTransaction = {
  sender: genesisSender,
  recipient: genesisReciever,
  token: NATIVE_TOKEN,
  value: 1,
  gasfee: 1,
  txHash: '',
  signature: { r: '', s: '' },
  txSecret: '8028f4ecd6da3344822baec652d52977973892f8766a6f78a8870f78c24ded51',
  txSecretDiff: 8,
  txSecretSolved: 'somethingRandom',
  nonce: 120,
  blockIndex: 0
}

