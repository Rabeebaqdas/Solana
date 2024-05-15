import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TokenStaking } from "../target/types/token_staking";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe("token_staking", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = provider.wallet as anchor.Wallet;
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const mintKeyPair = Keypair.generate();
  // const mintKeyPair = Keypair.fromSecretKey(
  //   new Uint8Array([
  //     36, 70, 213, 113, 12, 69, 76, 247, 165, 75, 89, 69, 36, 158, 66, 13, 11,
  //     197, 51, 189, 5, 76, 253, 128, 64, 147, 155, 113, 52, 48, 77, 96, 146, 31,
  //     22, 148, 16, 218, 82, 4, 104, 45, 58, 98, 13, 58, 40, 42, 84, 15, 7, 103,
  //     62, 72, 53, 145, 28, 188, 40, 132, 39, 97, 220, 241,
  //   ])
  // );
  // console.log(mintKeyPair);

  const program = anchor.workspace.TokenStaking as Program<TokenStaking>;

  async function createMintToken() {
    const mint = await createMint(
      connection,
      payer.payer,
      payer.publicKey,
      payer.publicKey,
      9,
      mintKeyPair
    );
    console.log(mint);
  }

  it("Is initialized!", async () => {
    await createMintToken();
    let [vaultAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );
    const tx = await program.methods
      .initialize()
      .accounts({
        signer: payer.publicKey,
        tokenVaultAccount: vaultAccount,
        mint: mintKeyPair.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("stake tokens!", async () => {
    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      payer.publicKey
    );

    await mintTo(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      userTokenAccount.address,
      payer.publicKey,
      1e11
    );

    let [stakeInfo] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake_info"), payer.publicKey.toBuffer()],
      program.programId
    );

    let [stakeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("token"), payer.publicKey.toBuffer()],
      program.programId
    );

    await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      payer.publicKey
    );

    const tx = await program.methods
      .stake(new anchor.BN(1000000000))
      .signers([payer.payer])
      .accounts({
        stakeInfoAccount: stakeInfo,
        stakeAccount: stakeAccount,
        userTokenAccount: userTokenAccount.address,
        mint: mintKeyPair.publicKey,
        signer: payer.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("unstake tokens!", async () => {
    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      payer.publicKey
    );

    let [stakeInfo] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake_info"), payer.publicKey.toBuffer()],
      program.programId
    );

    let [stakeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("token"), payer.publicKey.toBuffer()],
      program.programId
    );

    let [vaultAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      payer.publicKey
    );

    //funding the vault so that it can give the rewards
    await mintTo(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      vaultAccount,
      payer.publicKey,
      1e21
    );


    const tx = await program.methods
      .unstake()
      .signers([payer.payer])
      .accounts({
        stakeInfoAccount: stakeInfo,
        stakeAccount: stakeAccount,
        userTokenAccount: userTokenAccount.address,
        tokenVaultAccount: vaultAccount,
        mint: mintKeyPair.publicKey,
        signer: payer.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });
});
