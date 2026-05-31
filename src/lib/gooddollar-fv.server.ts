import { privateKeyToAccount } from "viem/accounts";
import { compressToEncodedURIComponent } from "lz-string";

/**
 * Multi-line FV identifier message — must match
 * @goodsdks/citizen-sdk constants.FV_IDENTIFIER_MSG2 EXACTLY.
 * The widget recovers the address from this signature, so any
 * deviation (whitespace, line endings, casing) breaks verification.
 */
const FV_IDENTIFIER_MSG2 = `Sign this message to request verifying your account <account> and to create your own secret unique identifier for your anonymized record.
You can use this identifier in the future to delete this anonymized record.
WARNING: do not sign this message unless you trust the website/application requesting this signature.`;

/**
 * Build a GoodDollar Face Verification URL — matches the
 * @goodsdks/citizen-sdk `IdentitySDK.generateFVLink()` output:
 *
 *   https://goodid.gooddollar.org/?lz=<compressToEncodedURIComponent(JSON)>
 *
 * Where JSON = { account, nonce, fvsig, chain, rdu | cbu }.
 */
export async function buildGoodDollarFVLink(
  privateKey: string,
  callbackUrl: string,
  opts: { popupMode?: boolean } = {},
): Promise<string> {
  const key = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
  const account = privateKeyToAccount(key);

  const nonce = Math.floor(Date.now() / 1000).toString();
  const fvSigMessage = FV_IDENTIFIER_MSG2.replace("<account>", account.address);
  const fvsig = await account.signMessage({ message: fvSigMessage });

  const params: Record<string, string | number> = {
    account: account.address, // EIP-55 checksummed
    nonce,
    fvsig,
    chain: 42220, // Celo mainnet — must be a number, not a string
  };
  params[opts.popupMode ? "cbu" : "rdu"] = callbackUrl;

  const lz = compressToEncodedURIComponent(JSON.stringify(params));
  return `https://goodid.gooddollar.org/?lz=${lz}`;
}
