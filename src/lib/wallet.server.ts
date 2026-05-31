import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { getAddress } from "viem";
import { encrypt, decrypt } from "./crypto.server";

export interface WalletBundle {
  address: string;
  encryptedPrivateKey: string;
}

export function generateCeloWallet(): WalletBundle {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    address: getAddress(account.address),
    encryptedPrivateKey: encrypt(privateKey),
  };
}

export function revealPrivateKey(encryptedPrivateKey: string): string {
  return decrypt(encryptedPrivateKey);
}
