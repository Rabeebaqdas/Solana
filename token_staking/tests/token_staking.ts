import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TokenStaking } from "../target/types/token_staking";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";

describe("token_staking", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = provider.wallet as anchor.Wallet;
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  // const mintKeyPair = Keypair.generate();
  const mintKeyPair = Keypair.fromSecretKey(
    new Uint8Array([
      15, 22, 18, 141, 131, 191, 84, 178, 190, 130, 9, 121, 246, 131, 81, 236,
      238, 224, 223, 92, 57, 209, 20, 43, 166, 49, 79, 80, 223, 91, 235, 227,
      61, 110, 244, 67, 190, 117, 255, 231, 69, 82, 202, 17, 154, 106, 195, 225,
      204, 93, 15, 67, 81, 236, 31, 136, 118, 30, 142, 131, 114, 109, 81, 77,
    ])
  );
  console.log(mintKeyPair);

  const program = anchor.workspace.TokenStaking as Program<TokenStaking>;

  // async function createMintToken() {
  //   const mint = await createMint(
  //     connection,
  //     payer.payer,
  //     payer.publicKey,
  //     payer.publicKey,
  //     9,
  //     mintKeyPair
  //   );
  //   console.log(mint);
  // }

  it("Is initialized!", async () => {
    let [vaultAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );
    const tx = await program.methods.initialize().accounts({
      signer: payer.publicKey,
      tokenVaultAccount: vaultAccount,
      mint: mintKeyPair.publicKey,
    }).rpc();
    console.log("Your transaction signature", tx);
  });
});
