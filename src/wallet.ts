import CryptoJS from 'crypto-js';
import { ec } from 'elliptic';
import type { AccountInterface, AddressInterface } from './interfaces.ts';
import { AddressClass, type AccountClass } from './classes.js';
import * as openpgp from 'openpgp';
import { readFileSync, writeFileSync, existsSync } from 'fs';


class PGPFileManager {

    constructor(
        private readonly data: AccountInterface<AddressInterface>
    ){}
    // ::::::::::::::  Create File ::::::::::::::::
     async createEncryptedFile(
        password: string,
        filename: string
    ): Promise<void> {
        const data = this.data;
        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({
                text: JSON.stringify(this.data)
            }),
            passwords: [password],
            format: 'binary'
        });

        require('fs').writeFileSync(filename, encrypted);
    }

    //:::::::::: Update Encrypted File ::::::::::::::
     async readData(
        filename: string,
        password: string, 
    ): Promise<AccountInterface> {
        const encryptedData = require('fs').readFileSync(filename);

        const { data: decrypted } = await openpgp.decrypt({
            message: await openpgp.readMessage({
                binaryMessage: encryptedData
            }),
            passwords: [password], 
            format: 'utf8'
        });

        const originalData = JSON.parse(decrypted as string);
        return originalData;
    };

    // static async updateData(
    //     filename: string,
    //     password: string,
    //     updates: number
    // ): Promise<void> {
    //     const data = this.readData(filename, password);
    //     (await data).address.balance = updates;
    //     await this.createEncryptedFile(updatedData, password, filename);
    // }

    //::::::::::: Get Data From Encrypted File ::::::::::::::
}