import {
  percentAmount,
  generateSigner,
  signerIdentity,
  createSignerFromKeypair,
  Pda,
} from "@metaplex-foundation/umi";
import {
  TokenStandard,
  mintV1,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import secret from "./guideSecret.json";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const umi = createUmi("https://api.devnet.solana.com"); //Replace with your QuickNode RPC Endpoint

const userWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
const userWalletSigner = createSignerFromKeypair(umi, userWallet);

const metadata = {
  name: "Futira",
  symbol: "FUT",
  uri: "https://emerald-remarkable-otter-771.mypinata.cloud/ipfs/QmcKB5dV4KXfUFzzPYDp8dJQGZEDpDhQsKXcfdnL9gCQvp",
};

const futiraAddress: any = new PublicKey(
  "4CFY1n2ECQhybmfzqbbjJkVshvSu1fUN8z2CmrmFE1Gt"
);
const amount_to_mint = 100_000000000;
umi.use(signerIdentity(userWalletSigner));
umi.use(mplTokenMetadata());

const tx = mintV1(umi, {
  mint: futiraAddress,
  authority: umi.identity,
  amount: amount_to_mint,
  tokenOwner: userWallet.publicKey,
  tokenStandard: TokenStandard.Fungible,
})
  .sendAndConfirm(umi)
  .then(() => {
    console.log(
      `Successfully minted ${amount_to_mint / LAMPORTS_PER_SOL} tokens`
    );
  })
  .catch((err) => {
    console.error("Error minting tokens:", err);
  });
