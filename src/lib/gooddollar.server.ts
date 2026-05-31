import { createPublicClient, http, isAddress, getAddress } from "viem";
import { celo } from "viem/chains";

// GoodDollar IdentityV2 on Celo mainnet
const IDENTITY_ADDRESS = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42" as const;

const IDENTITY_ABI = [
  {
    name: "isWhitelisted",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "lastAuthenticated",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "authenticationPeriod",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const client = createPublicClient({
  chain: celo,
  transport: http("https://forno.celo.org"),
});

export type GoodDollarStatus = {
  isWhitelisted: boolean;
  /** Unix seconds when verification was last (re)authenticated; 0 if never */
  lastAuthenticated: number;
  /** Days */
  authenticationPeriod: number;
  /** ISO string; null if not verified */
  expiresAt: string | null;
};

export function normalizeCeloAddress(address: string): string {
  if (!isAddress(address)) throw new Error("Invalid EVM address");
  return getAddress(address);
}

export async function checkGoodDollarStatus(address: string): Promise<GoodDollarStatus> {
  const addr = normalizeCeloAddress(address) as `0x${string}`;

  const [whitelisted, last, period] = await Promise.all([
    client.readContract({ address: IDENTITY_ADDRESS, abi: IDENTITY_ABI, functionName: "isWhitelisted", args: [addr] }),
    client.readContract({ address: IDENTITY_ADDRESS, abi: IDENTITY_ABI, functionName: "lastAuthenticated", args: [addr] }),
    client.readContract({ address: IDENTITY_ADDRESS, abi: IDENTITY_ABI, functionName: "authenticationPeriod" }),
  ]);

  const lastSec = Number(last);
  const periodDays = Number(period);
  const expiresAtSec = lastSec > 0 ? lastSec + periodDays * 86_400 : 0;

  return {
    isWhitelisted: Boolean(whitelisted),
    lastAuthenticated: lastSec,
    authenticationPeriod: periodDays,
    expiresAt: expiresAtSec > 0 ? new Date(expiresAtSec * 1000).toISOString() : null,
  };
}
