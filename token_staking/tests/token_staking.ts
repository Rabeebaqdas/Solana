import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TokenStaking } from "../target/types/token_staking";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  
} from "@solana/spl-token";

function sleep(ms:number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}



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

  it("Initializing Contract", async () => {
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

  it("Sending tokens to the user and pda!", async () => {
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

    console.log("Tokens transferred successfully");
  });

  it("stake tokens!", async () => {
    //making associated token account to hold the user's tokens
    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      payer.publicKey
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
    console.log('User Account Balance Before: ', (await connection.getTokenAccountBalance(userTokenAccount.address)).value.uiAmount);
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
    // console.log('Stake Account Balance After: ', (await connection.getTokenAccountBalance(stakeAccount)).value.uiAmount);


  });

  it("Again Stake tokens!", async () => {
    await sleep(1000);
    //making associated token account to hold the user's tokens
    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeyPair.publicKey,
      payer.publicKey
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
    console.log('Stake Account Balance Before 2nd Stake: ', (await connection.getTokenAccountBalance(stakeAccount)).value.uiAmount);

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
    console.log('Stake Account Balance After 2nd Stake: ', (await connection.getTokenAccountBalance(stakeAccount)).value.uiAmount);

  });

  it("Claim Rewards", async () => {
    await sleep(10000);
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

    // Fetch the details of stake Info account
    console.log(
      "Stake Account Info Before:",
      (await program.account.stakeInfo.fetch(stakeInfo)).pendingRewards.toString()
    );
    console.log('Stake Account Balance Before Claiming Rewards: ', (await connection.getTokenAccountBalance(stakeAccount)).value.uiAmount);

    const tx = await program.methods
      .claimReward()
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

    // Fetch the details of stake Info account
    console.log(
      "Stake Account Info After:",
      (await program.account.stakeInfo.fetch(stakeInfo)).pendingRewards
      .toString());
    console.log('Stake Account Balance After Claiming Rewards: ', (await connection.getTokenAccountBalance(stakeAccount)).value.uiAmount);

  });

  it("Unstake tokens!", async () => {
    await sleep(10000);
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
    console.log('Stake Account Balance Before unstake: ', (await connection.getTokenAccountBalance(stakeAccount)).value.uiAmount);

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
    console.log('Stake Account Balance After unstake: ', (await connection.getTokenAccountBalance(stakeAccount)).value.uiAmount);
    console.log('User Account Balance After: ', (await connection.getTokenAccountBalance(userTokenAccount.address)).value.uiAmount);

  });
});
