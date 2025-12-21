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


