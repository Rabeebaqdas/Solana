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
  // const mintKeyPair = Keypair.generate();
  const mintKeyPair = Keypair.fromSecretKey(
    new Uint8Array([
      156, 128, 111,  56, 158, 125, 251,  63, 139,   1,  98,
      136,   7,  94,  15,  34, 251,  75,  69, 191,  66, 239,
      123,  58, 103, 109, 106, 130, 248,  25, 181, 249, 139,
       40, 145, 227, 134,  85, 112, 183, 163, 182,  53, 145,
        2, 128, 117,  43, 172, 136, 210, 231, 224, 237,  15,
        3, 182, 142,  99,  25,  93, 208, 119, 182
    ])
  );
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
    // await createMintToken();
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
