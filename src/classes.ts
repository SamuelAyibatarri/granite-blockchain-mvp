import type { AddressInterface, VerifiedTransaction } from "./interfaces";

export class AccountClass {
  private address: AddressClass;

  constructor(
    private readonly privateKeyHex: string,
    private readonly prefix: string,
    private readonly publicKeyHex: string,
    private balance: number,
    public readonly nonce: number,
    private readonly passKey: string
  ) {
    this.address = new AddressClass(this.publicKeyHex, this.balance, this.nonce);
  }

  // Delegateclass to Address 
  updateBalance(newBalance: number, passKey: string): void {
    if (!passKey || passKey !== this.passKey) {
      throw new Error("Incorrect Pass Key!");
    }
    this.address.updateBalance(newBalance);
    this.balance = newBalance; // Keep sync
  }

  get getAddress(): string {
    return `${this.prefix}_${this.publicKeyHex}`;
  }

  get getPublicKeyHex(): string {
    return this.publicKeyHex;
  }

  get currentBalance(): number {
    return this.balance;
  }

}

export class AddressClass {
  constructor(
    private readonly publicKeyHex: string,
    private balance: number,
    public readonly nonce: number,
  ) { }

  updateBalance(newBalance: number) {
    this.balance = newBalance;
    console.log("Balance Updated Successfully!");
  }

  get getPublicKeyHex(): string {
    return this.publicKeyHex;
  }
}

export class Block {
  public index: number;
  public hash: string;
  public previousHash: string;
  public timestamp: number;
  public difficulty: number;
  public nonce: number = Number(`${Date.now}-${Math.floor(Math.random() * 1000000)}`);
  public minterBalance: number;
  public minterAddress: AddressInterface;
  public accumulatorRoot: string;
  public transaction: VerifiedTransaction;

  constructor(index: number, hash: string, previousHash: string, timestamp: number, difficulty: number, minterBalance: number, minterAddress: AddressInterface, accumulatorRoot: string, transaction: VerifiedTransaction) {
    this.index = index;
    this.hash = hash;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.difficulty = difficulty;
    this.minterBalance = minterBalance;
    this.minterAddress = minterAddress;
    this.accumulatorRoot = accumulatorRoot;
    this.transaction = transaction;
  }
}


