import type * as Interfaces from "./interfaces.ts"
import { readFile } from "./util"
import { UNVERIFIED_TRANSACTIONS_PATH } from "./constants.js";

export function getUnverifiedTransactionPool(): Interfaces.Transaction[] {
  const data = readFile(UNVERIFIED_TRANSACTIONS_PATH, "UTP") as Interfaces.UnverifiedTransactionPoolInterface;
  if (!data) throw new Error("An error occured");
  return data.pool as Interfaces.Transaction[];
};

export function selectRandomTransaction(n: number = 1, transactionData: Interfaces.Transaction[]): Interfaces.Transaction { /// -> This function should only select just one transaction by default
  if (transactionData.length === 0) throw new Error("There's nothing in the transaction data");
  if (n < 1) throw new Error("Pick a valid number!");
  const randomIndex = Math.floor(Math.random() * transactionData.length);
  const result: Interfaces.Transaction = transactionData[randomIndex] as Interfaces.Transaction;
  return result
}
