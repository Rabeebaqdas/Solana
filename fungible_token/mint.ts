import { percentAmount, generateSigner, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi'
import { TokenStandard, createAndMint, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import secret from './guideSecret.json';

const umi = createUmi('https://api.devnet.solana.com'); //Replace with your QuickNode RPC Endpoint

const userWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
const userWalletSigner = createSignerFromKeypair(umi, userWallet);

const metadata = {
    name: "Futira",
    symbol: "FUT",
    uri: "https://emerald-remarkable-otter-771.mypinata.cloud/ipfs/QmcKB5dV4KXfUFzzPYDp8dJQGZEDpDhQsKXcfdnL9gCQvp",
};
//https://ipfs.io/ipfs/QmcKB5dV4KXfUFzzPYDp8dJQGZEDpDhQsKXcfdnL9gCQvp
const mint = generateSigner(umi);
umi.use(signerIdentity(userWalletSigner));
umi.use(mplTokenMetadata())

createAndMint(umi, {
    mint,
    authority: umi.identity,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: 9,
    amount: Number("1000000000000000000"),
    tokenOwner: userWallet.publicKey,
    tokenStandard: TokenStandard.Fungible,
}).sendAndConfirm(umi)
    .then(() => {
        console.log("Successfully minted 1 billion tokens (", mint.publicKey, ")");
    })
    .catch((err) => {
        console.error("Error minting tokens:", err);
    });