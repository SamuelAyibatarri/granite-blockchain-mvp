import { z } from 'zod';

// 1. Base Schemas (Dependencies)

export const SignatureSchema = z.object({
  r: z.string(),
  s: z.string(),
});

export const TokenSchema = z.object({
  tokenId: z.string(),
  name: z.string(),
  contractAddress: z.string(),
  ticker: z.string(),
  totalSupply: z.number(),
  circulatingSupply: z.number(),
});

export const AddressInterfaceSchema = z.object({
  publicKeyHex: z.string(),
  balance: z.number(),
  nonce: z.number(),
});

// 2. Transaction Schemas

export const TransactionSchema = z.object({
  nonce: z.number(),
  sender: AddressInterfaceSchema,
  recipient: AddressInterfaceSchema,
  token: TokenSchema,
  value: z.number(),
  gasfee: z.number(),
  txHash: z.string(),
  signature: SignatureSchema,
  txSecret: z.string(),
  txSecretDiff: z.number(),
});

export const VerifiedTransactionSchema = z.object({
  nonce: z.number(),
  sender: AddressInterfaceSchema,
  recipient: AddressInterfaceSchema,
  token: TokenSchema,
  value: z.number(),
  gasfee: z.number(),
  txHash: z.string(),
  signature: SignatureSchema,
  txSecret: z.string(),
  txSecretDiff: z.number(),
  txSecretSolved: z.string(),
  blockIndex: z.number(),
});

// 3. Complex/Generic Structures

// Factory for the generic AccountInterface<T>
export const createAccountSchema = <T extends z.ZodTypeAny>(addressSchema: T) =>
  z.object({
    privateKeyHex: z.string(),
    address: addressSchema,
  });

export const WalletDataSchema = z.object({
  // accountDetails is defined as AccountInterface<AddressInterface> in your interface
  accountDetails: createAccountSchema(AddressInterfaceSchema),
  transactionHistory: z.object({
    TxIN: z.array(TransactionSchema),
    TxOut: z.array(TransactionSchema),
  }),
});

export const UnverifiedTransactionPoolInterfaceSchema = z.object({
  pool: z.array(TransactionSchema),
});

// 4. Blockchain & Block Schemas

export const BlockSchema = z.object({
  prevBlockHash: z.string(),
  currentBlockHash: z.string(),
  blockIndex: z.number(),
  transaction: VerifiedTransactionSchema,
  timestamp: z.number(),
  validator: z.string(),
  difficulty: z.number(),
});

export const blockchainStateSchema = z.object({
  chainLength: z.number(),
  chainSize: z.number(),
  nativeToken: TokenSchema,
  cumulativeDifficulty: z.number(),
});

export const BlockchainSchema = z.object({
  blocks: z.array(BlockSchema),
  stateRoot: z.string(),
  state: blockchainStateSchema,
});

// 5. Exported Types (Optional: Inference)
export type Signature = z.infer<typeof SignatureSchema>;
export type Token = z.infer<typeof TokenSchema>;
export type AddressInterface = z.infer<typeof AddressInterfaceSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type VerifiedTransaction = z.infer<typeof VerifiedTransactionSchema>;
export type WalletData = z.infer<typeof WalletDataSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Blockchain = z.infer<typeof BlockchainSchema>;