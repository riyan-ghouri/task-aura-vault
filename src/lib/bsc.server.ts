import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  formatEther,
  getAddress,
  encodeFunctionData,
  isAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decrypt } from "./crypto.server";

// USDT BEP20 contract on BNB Smart Chain (18 decimals — unusual for USDT but correct on BSC)
const USDT_BEP20 = "0x55d398326f99059fF775485246999027B3197955" as const;
const USDT_DECIMALS = 18;

const RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org";

const erc20Abi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const publicBsc = createPublicClient({ chain: bsc, transport: http(RPC_URL) });

function normalizeHexKey(input: string): `0x${string}` {
  const trimmed = input.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/.test(trimmed)) {
    throw new Error("Private key must be 64 hex characters");
  }
  return `0x${trimmed}` as `0x${string}`;
}

export function deriveAddressFromKey(privateKey: string): string {
  const pk = normalizeHexKey(privateKey);
  return privateKeyToAccount(pk).address;
}

export { normalizeHexKey };

async function loadAdminKey(): Promise<{ privateKey: `0x${string}`; address: `0x${string}` }> {
  const { data, error } = await supabaseAdmin
    .from("admin_wallets")
    .select("address, encrypted_private_key")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw new Error(`Admin wallet lookup failed: ${error.message}`);
  if (!data?.encrypted_private_key || !data.address) {
    throw new Error("Admin hot wallet is not configured. Set it in Admin → Payouts.");
  }
  const decrypted = decrypt(data.encrypted_private_key);
  const pk = normalizeHexKey(decrypted);
  return { privateKey: pk, address: getAddress(data.address) as `0x${string}` };
}

export interface AdminBalances {
  address: string | null;
  hasKey: boolean;
  bnb: string;
  usdt: string;
}

export async function getAdminBalances(): Promise<AdminBalances> {
  const { data } = await supabaseAdmin
    .from("admin_wallets")
    .select("address, encrypted_private_key")
    .eq("id", "default")
    .maybeSingle();
  if (!data?.address) return { address: null, hasKey: false, bnb: "0", usdt: "0" };
  const addr = getAddress(data.address) as `0x${string}`;
  try {
    const [bnbWei, usdtRaw] = await Promise.all([
      publicBsc.getBalance({ address: addr }),
      publicBsc.readContract({
        address: USDT_BEP20,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [addr],
      }) as Promise<bigint>,
    ]);
    return {
      address: addr,
      hasKey: !!data.encrypted_private_key,
      bnb: formatEther(bnbWei),
      usdt: formatUnits(usdtRaw, USDT_DECIMALS),
    };
  } catch {
    return { address: addr, hasKey: !!data.encrypted_private_key, bnb: "0", usdt: "0" };
  }
}

export async function sendUsdtBep20(toAddress: string, amount: number): Promise<{ txHash: string }> {
  if (!isAddress(toAddress)) throw new Error("Invalid recipient address");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  const { privateKey, address: from } = await loadAdminKey();
  const value = parseUnits(amount.toFixed(USDT_DECIMALS).replace(/0+$/, "").replace(/\.$/, ""), USDT_DECIMALS);

  // Pre-flight: balances
  const [usdtBalance, bnbBalance] = await Promise.all([
    publicBsc.readContract({
      address: USDT_BEP20,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [from],
    }) as Promise<bigint>,
    publicBsc.getBalance({ address: from }),
  ]);
  if (usdtBalance < value) {
    throw new Error(`Hot wallet USDT balance too low (${formatUnits(usdtBalance, USDT_DECIMALS)} < ${amount})`);
  }
  if (bnbBalance === 0n) {
    throw new Error("Hot wallet has no BNB for gas. Fund the admin wallet with a small amount of BNB.");
  }

  const account = privateKeyToAccount(privateKey);
  const wallet = createWalletClient({ account, chain: bsc, transport: http(RPC_URL) });

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [getAddress(toAddress), value],
  });

  const txHash = await wallet.sendTransaction({
    to: USDT_BEP20,
    data,
    value: 0n,
  });

  // Wait for 1 confirmation, but don't hang forever
  try {
    await publicBsc.waitForTransactionReceipt({ hash: txHash, timeout: 60_000, confirmations: 1 });
  } catch {
    // Tx was broadcast; surface hash even if confirmation timed out
  }

  return { txHash };
}