import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Safepay } from "../target/types/safepay";
import { assert } from "chai";

interface PDAParameters {
  escrowWalletKey: anchor.web3.PublicKey;
  stateKey: anchor.web3.PublicKey;
  idx: anchor.BN;
}

describe("safepay", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const program = anchor.workspace.Safepay as Program<Safepay>;
  let mintAddress: anchor.web3.PublicKey;
  let alice: anchor.web3.Keypair;
  let aliceWallet: anchor.web3.PublicKey;
  let bob: anchor.web3.Keypair;
  let pda: PDAParameters;

  const getPdaParams = async (
    connection: anchor.web3.Connection,
    alice: anchor.web3.PublicKey,
    bob: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey
  ): Promise<PDAParameters> => {
    const uid = new anchor.BN(parseInt((Date.now() / 1000).toString()));
    const uidBuffer = uid.toBuffer("le", 8);

    let [statePubKey] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("state"),
        alice.toBuffer(),
        bob.toBuffer(),
        mint.toBuffer(),
        uidBuffer,
      ],
      program.programId
    );
    let [walletPubKey] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("wallet"),
        alice.toBuffer(),
        bob.toBuffer(),
        mint.toBuffer(),
        uidBuffer,
      ],
      program.programId
    );
    return {
      idx: uid,
      escrowWalletKey: walletPubKey,
      stateKey: statePubKey,
    };
  };

  const createMintToken = async (
    connection: anchor.web3.Connection
  ): Promise<anchor.web3.PublicKey> => {
    const mintKeyPair = Keypair.generate();
    const payer = provider.wallet as anchor.Wallet;
    const mint = await createMint(
      connection,
      payer.payer,
      payer.publicKey,
      payer.publicKey,
      6,
      mintKeyPair
    );

    console.log(mint);

    console.log(`[${mintKeyPair.publicKey}] Created new mint account`);
    return mintKeyPair.publicKey;
  };

  const createUserAndAssociatedWallet = async (
    connection: anchor.web3.Connection,
    mint?: anchor.web3.PublicKey
  ): Promise<[anchor.web3.Keypair, anchor.web3.PublicKey | undefined]> => {
    console.log(
      "----------------------------------------------------------------"
    );

    const user = Keypair.generate();
    const payer = provider.wallet as anchor.Wallet;
    let userAssociatedTokenAccount = undefined;
    // Fund user with some SOL
    let txFund = new anchor.web3.Transaction();
    txFund.add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: user.publicKey,
        lamports: 5 * anchor.web3.LAMPORTS_PER_SOL,
      })
    );
    const sigTxFund = await provider.sendAndConfirm(txFund);

    console.log(
      `[${user.publicKey.toBase58()}] Funded new account with 5 SOL: ${sigTxFund}`
    );
    if (mint) {
      //making associated token account to hold the user's tokens
      userAssociatedTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer.payer,
        mint,
        user.publicKey
      );

      await mintTo(
        connection,
        payer.payer,
        mint,
        userAssociatedTokenAccount.address,
        payer.publicKey,
        1337000000
      );
      console.log(
        `[${
          userAssociatedTokenAccount.address
        }] New associated account for mint ${mint.toBase58()}`
      );
    }
    console.log(
      "----------------------------------------------------------------"
    );

    return [user, userAssociatedTokenAccount?.address];
  };

  const readAccount = async (
    accountPublicKey: anchor.web3.PublicKey,
    provider: anchor.Provider
  ): Promise<[spl.RawAccount, string]> => {
    const tokenInfoLol = await provider.connection.getAccountInfo(
      accountPublicKey
    );

    const data = Buffer.from(tokenInfoLol.data);
    const accountInfo: spl.RawAccount = spl.AccountLayout.decode(data);
    return [accountInfo, accountInfo.amount.toString()];
  };

  // const readMint = async (
  //   mintPublicKey: anchor.web3.PublicKey,
  //   provider: anchor.Provider
  // ): Promise<spl.RawMint> => {
  //   const tokenInfo = await provider.connection.getAccountInfo(mintPublicKey);
  //   const data = Buffer.from(tokenInfo.data);
  //   const accountInfo = spl.MintLayout.decode(data);
  //   return {
  //     ...accountInfo,
  //     mintAuthority:
  //       accountInfo.mintAuthority == null ? null : accountInfo.mintAuthority,
  //     freezeAuthority:
  //       accountInfo.freezeAuthority == null
  //         ? null
  //         : accountInfo.freezeAuthority,
  //   };
  // };

  beforeEach(async () => {
    mintAddress = await createMintToken(provider.connection);
    [alice, aliceWallet] = await createUserAndAssociatedWallet(
      provider.connection,
      mintAddress
    );

    let _rest;
    [bob, ..._rest] = await createUserAndAssociatedWallet(provider.connection);

    pda = await getPdaParams(
      provider.connection,
      alice.publicKey,
      bob.publicKey,
      mintAddress
    );
  });

  it("Initialize and Complete Grant", async () => {
    const [, aliceBalancePre] = await readAccount(aliceWallet, provider);
    assert.equal(aliceBalancePre, "1337000000");
    const amount = new anchor.BN(20000000);

    const tx = await program.methods
      .initializeNewGrant(pda.idx, amount)
      .accounts({
        applicationState: pda.stateKey,
        escrowWalletState: pda.escrowWalletKey,
        userSending: alice.publicKey,
        userReceiving: bob.publicKey,
        mintOfTokenBeingSent: mintAddress,
        walletToWithdrawFrom: aliceWallet,

        systemProgram: anchor.web3.SystemProgram.programId,
        // rent: anchor.web3.SYSVAR_RENT_PUBKEY,  //no need for this account 
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([alice])
      .rpc();

    console.log(
      `Initialized a new Safe Pay instance. Alice will pay bob 20 tokens`
    );

    console.log("Initialize New Grant transaction signature", tx);

    // Fetch the details of Application State account
    console.log(
      "Current State After",
      (await program.account.details.fetch(pda.stateKey)).stage
    );

    // Assert that 20 tokens were moved from Alice's account to the escrow.
    const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
    assert.equal(aliceBalancePost, "1317000000");
    const [, escrowBalancePost] = await readAccount(
      pda.escrowWalletKey,
      provider
    );
    assert.equal(escrowBalancePost, "20000000");

    // Create a token account for Bob.
    const bobTokenAccount = await spl.getAssociatedTokenAddress(
      mintAddress,
      bob.publicKey,
      false,
      spl.TOKEN_PROGRAM_ID,
      spl.ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("Bob Associated Account", bobTokenAccount);

    const tx2 = await program.methods
      .completeGrant(pda.idx)
      .accounts({
        applicationState: pda.stateKey,
        escrowWalletState: pda.escrowWalletKey,
        walletToDepositTo: bobTokenAccount,
        userSending: alice.publicKey,
        userReceiving: bob.publicKey,
        mintOfTokenBeingSent: mintAddress,

        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        // rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([bob])
      .rpc();

    console.log("Complete Grant transaction signature", tx2);

    // Assert that 20 tokens were sent back.
    const [, bobBalance] = await readAccount(bobTokenAccount, provider);
    assert.equal(bobBalance, "20000000");
    // // Assert that escrow was correctly closed.
    try {
      const [info, balance] = await readAccount(pda.escrowWalletKey, provider);
      console.log("===========>", info, balance);
      return assert.fail("Account should be closed");
    } catch (e) {
      assert.equal(
        e.message,
        "Cannot read properties of null (reading 'data')"
      );
    }
    // Fetch the details of Application State account
    console.log(
      "Current State After",
      (await program.account.details.fetch(pda.stateKey)).stage
    );
  });

  it.only("can pull back funds once they are deposited", async () => {
    const [, aliceBalancePre] = await readAccount(aliceWallet, provider);
    assert.equal(aliceBalancePre, "1337000000");
    const amount = new anchor.BN(20000000);

    const tx = await program.methods
      .initializeNewGrant(pda.idx, amount)
      .accounts({
        applicationState: pda.stateKey,
        escrowWalletState: pda.escrowWalletKey,
        userSending: alice.publicKey,
        userReceiving: bob.publicKey,
        mintOfTokenBeingSent: mintAddress,
        walletToWithdrawFrom: aliceWallet,

        systemProgram: anchor.web3.SystemProgram.programId,
        // rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([alice])
      .rpc();

    console.log(
      `Initialized a new Safe Pay instance. Alice will pay bob 20 tokens`
    );

    console.log("Initialize New Grant transaction signature", tx);

    // Assert that 20 tokens were moved from Alice's account to the escrow.
    const [, aliceBalancePost] = await readAccount(aliceWallet, provider);
    assert.equal(aliceBalancePost, "1317000000");
    const [, escrowBalancePost] = await readAccount(
      pda.escrowWalletKey,
      provider
    );
    assert.equal(escrowBalancePost, "20000000");

    // //trying to send funds in the different account that is not owned by alice
    // let maliciousWallet: anchor.web3.PublicKey;
    // [, maliciousWallet] = await createUserAndAssociatedWallet(
    //   provider.connection,
    //   mintAddress
    // );

    // Withdraw the funds back
    const tx2 = await program.methods
      .pullBack(pda.idx)
      .accounts({
        applicationState: pda.stateKey,
        escrowWalletState: pda.escrowWalletKey,
        refundWallet: aliceWallet,
        userSending: alice.publicKey,
        userReceiving: bob.publicKey,
        mintOfTokenBeingSent: mintAddress,

        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        // rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([bob])
      .rpc();

    console.log("Pull Back transaction signature", tx2);

    // Assert that 20 tokens were sent back.
    const [, aliceBalanceRefund] = await readAccount(aliceWallet, provider);
    assert.equal(aliceBalanceRefund, "1337000000");
    // // Assert that escrow was correctly closed.
    try {
      const [info, balance] = await readAccount(pda.escrowWalletKey, provider);
      console.log("===========>", info, balance);
      return assert.fail("Account should be closed");
    } catch (e) {
      assert.equal(
        e.message,
        "Cannot read properties of null (reading 'data')"
      );
    }
  });
});
