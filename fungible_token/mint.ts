import {
  signerIdentity,
  createSignerFromKeypair,
} from "@metaplex-foundation/umi";
import {
  TokenStandard,
  mintV1,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import secret from "./guideSecret.json";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const umi = createUmi("https://api.devnet.solana.com");

const userWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
const userWalletSigner = createSignerFromKeypair(umi, userWallet);

const futiraAddress: any = new PublicKey(
  "4CFY1n2ECQhybmfzqbbjJkVshvSu1fUN8z2CmrmFE1Gt"
);
const amount_to_mint = 100_000000000;

umi.use(signerIdentity(userWalletSigner));
umi.use(mplTokenMetadata());

async function mintTokens() {
  try {
    await mintV1(umi, {
      mint: futiraAddress,
      authority: umi.identity,
      amount: amount_to_mint,
      tokenOwner: userWallet.publicKey,
      tokenStandard: TokenStandard.Fungible,
    }).sendAndConfirm(umi);

    console.log(
      `Successfully minted ${amount_to_mint / LAMPORTS_PER_SOL} tokens`
    );
  } catch (err) {
    console.error("Error minting tokens:", err);
    process.exit(1);
  }
}

mintTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
