import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createGenericFile,
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  percentAmount,
  sol,
} from "@metaplex-foundation/umi";
import { mockStorage } from "@metaplex-foundation/umi-storage-mock";
import * as fs from "fs";
import secret from "./guideSecret.json";

const metadataUri = "https://emerald-remarkable-otter-771.mypinata.cloud/ipfs/Qmc3RLbT7aEDNr56tHKTtp3aJcc1FQH9VwGXRNQJp2XHSd"
const umi = createUmi("https://api.devnet.solana.com");
const creatorWallet = umi.eddsa.createKeypairFromSecretKey(
  new Uint8Array(secret)
);
const creator = createSignerFromKeypair(umi, creatorWallet);
umi.use(keypairIdentity(creator));
umi.use(mplTokenMetadata());
umi.use(mockStorage());

const nftDetail = {
  name: "Decrypted Labs",
  symbol: "DL",
  uri: "IPFS_URL_OF_METADATA",
  royalties: 5.5,
  description: "Decrypted Labs is the full-cycle software and mobile app development company with a world-class team of innovators.",
  imgType: "image/jpeg",
  attributes: [{ trait_type: "Speed", value: "Quick" }],
};

// async function uploadImage(): Promise<string> {
//   try {
//     const imgDirectory = "./uploads";
//     const imgName = "logo.jpeg";
//     const filePath = `${imgDirectory}/${imgName}`;
//     const fileBuffer = fs.readFileSync(filePath);
//     const image = createGenericFile(fileBuffer, imgName, {
//       uniqueName: nftDetail.name,
//       contentType: nftDetail.imgType,
//     });
//     const [imgUri] = await umi.uploader.upload([image]);
//     console.log("Uploaded image:", imgUri);
//     return imgUri;
//   } catch (e) {
//     throw e;
//   }
// }

// async function uploadMetadata(imageUri: string): Promise<string> {
//   try {
//     const metadata = {
//       name: nftDetail.name,
//       description: nftDetail.description,
//       image: imageUri,
//       attributes: nftDetail.attributes,
//       properties: {
//         files: [
//           {
//             type: nftDetail.imgType,
//             uri: imageUri,
//           },
//         ],
//       },
//     };
//     const metadataUri = await umi.uploader.uploadJson(metadata);
//     console.log("Uploaded metadata:", metadataUri);
//     return metadataUri;
//   } catch (e) {
//     throw e;
//   }
// }

async function mintNft(metadataUri: string) {
  try {
    const mint = generateSigner(umi);
    await createNft(umi, {
      mint,
      name: nftDetail.name,
      symbol: nftDetail.symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(nftDetail.royalties),
      creators: [{ address: creator.publicKey, verified: true, share: 100 }],
    }).sendAndConfirm(umi);
    console.log(`Created NFT: ${mint.publicKey.toString()}`);
  } catch (e) {
    throw e;
  }
}

async function createAndMintNFT() {
  //These two functions are just for making mock metadata of the nft. Best for testing environment.
  // const imageUri = await uploadImage();
  // const metadataUri = await uploadMetadata(imageUri);
  await mintNft(metadataUri);
}

createAndMintNFT()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
