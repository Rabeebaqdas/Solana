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
  //     99, 3, 113, 227, 15, 233, 251, 120, 94, 162, 132, 156, 3, 192, 182, 78,
  //     241, 77, 98, 187, 67, 148, 172, 67, 22, 193, 0, 104, 90, 201, 223, 203,
  //     102, 126, 148, 163, 97, 239, 92, 183, 157, 204, 108, 15, 94, 42, 89, 244,
  //     239, 115, 59, 190, 9, 125, 16, 122, 79, 135, 130, 64, 82, 106, 183, 121,
  //   ])
  // );
  console.log(mintKeyPair);

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
    let [vaultAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );
    //making associated token account to hold the user's tokens
    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      payer.publicKey
    );

    // mint 10 tokens in the user's associated token account
    await mintTo(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      userTokenAccount.address,
      payer.publicKey,
      1e11
    );

    // sending funds in the vault to give rewards to users after making users associated accounts
    await mintTo(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      vaultAccount,
      payer.publicKey,
      1e15
    );

    // getting the pda of users stake info account
    let [stakeInfo] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake_info"), payer.publicKey.toBuffer()],
      program.programId
    );

    // getting the pda of users stake account
    let [stakeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("token"), payer.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .stake(new anchor.BN(1000000000))
      .signers([payer.payer])
      .accounts({
        stakeInfoAccount: stakeInfo,
        stakeAccount: stakeAccount,
        // tokenVaultAccount: vaultAccount,
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
