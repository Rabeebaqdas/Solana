import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Presale } from "../target/types/presale";
import { assert } from "chai";

interface PDAParameters {
  usdcVault: anchor.web3.PublicKey;
  dlVault: anchor.web3.PublicKey;
  presalePDA: anchor.web3.PublicKey;
  firstAllocation: anchor.BN;
  secondAllocation: anchor.BN;
  thirdAllocation: anchor.BN;
  roundOnePrice: anchor.BN;
  roundTwoPrice: anchor.BN;
  roundThreePrice: anchor.BN;
}

describe("presale", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const program = anchor.workspace.Presale as Program<Presale>;
  let usdcAddress: anchor.web3.PublicKey;
  let dlAddress: anchor.web3.PublicKey;
  let admin: anchor.web3.Keypair;
  let adminWallet: anchor.web3.PublicKey;
  // let bob: anchor.web3.Keypair;
  let pda: PDAParameters;

  const getPdaParams = async (
    connection: anchor.web3.Connection,
    mint: anchor.web3.PublicKey
  ): Promise<PDAParameters> => {
    const firstAllocation = new anchor.BN(1000000000000);
    const secondAllocation = new anchor.BN(2000000000000);
    const thirdAllocation = new anchor.BN(3000000000000);

    const roundOnePrice = new anchor.BN(1000000000);
    const roundTwoPrice = new anchor.BN(2000000000);
    const roundThreePrice = new anchor.BN(3000000000);

    let [presalePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("presale_info")],
      program.programId
    );

    let [usdcVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("usdc_vault")],
      program.programId
    );

    let [dlVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault")],
      program.programId
    );

    return {
      firstAllocation: firstAllocation,
      secondAllocation: secondAllocation,
      thirdAllocation: thirdAllocation,
      presalePDA: presalePDA,
      usdcVault: usdcVault,
      dlVault: dlVault,
      roundOnePrice: roundOnePrice,
      roundTwoPrice: roundTwoPrice,
      roundThreePrice: roundThreePrice,
    };
  };

  const createToken = async (
    connection: anchor.web3.Connection
  ): Promise<anchor.web3.PublicKey> => {
    const mintAddress = Keypair.generate();
    const payer = provider.wallet as anchor.Wallet;
    // making USDC token
    const mint = await createMint(
      connection,
      payer.payer,
      payer.publicKey,
      payer.publicKey,
      9,
      mintAddress
    );

    console.log(mint);

    console.log(`[${mintAddress.publicKey}] Created new mint account`);
    return mintAddress.publicKey;
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
        7000000000000
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

  const init = async () => {
    usdcAddress = await createToken(provider.connection);
    dlAddress = await createToken(provider.connection);

    [admin, adminWallet] = await createUserAndAssociatedWallet(
      provider.connection,
      dlAddress
    );

    pda = await getPdaParams(provider.connection, usdcAddress);
  };

  it("Initialize the presale", async () => {
    await init();
    const [, adminBalancePre] = await readAccount(adminWallet, provider);

    assert.equal(adminBalancePre, "7000000000000");

    const tx = await program.methods
      .initialize(
        pda.firstAllocation,
        pda.secondAllocation,
        pda.thirdAllocation,
        pda.roundOnePrice,
        pda.roundTwoPrice,
        pda.roundThreePrice
      )
      .accounts({
        presaleInfo: pda.presalePDA,
        usdcVault: pda.usdcVault,
        tokenVault: pda.dlVault,
        admin: admin.publicKey,
        walletOfDepositor: adminWallet,
        mintOfTokenUserSend: usdcAddress,
        mintOfTokenProgramSent: dlAddress,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    console.log(
      `Initialized a presale. admin has deposited 7000 in the presale contract`
    );

    console.log("Initialize New Grant transaction signature", tx);

    // Fetch the details of Presale Info account
    console.log(
      "Presale Info",
      await program.account.preSaleDetails.fetch(pda.presalePDA)
    );

    console.log(
      "Presale Owner",
      (
        await program.account.preSaleDetails.fetch(pda.presalePDA)
      ).owner.toString()
    );

    // Assert that 6000 usdc were moved from admin's account to the presale vault.
    const [, adminBalancePost] = await readAccount(adminWallet, provider);
    assert.equal(adminBalancePost, "1000000000000");
    const [, dlVaultBalancePost] = await readAccount(pda.dlVault, provider);
    assert.equal(dlVaultBalancePost, "6000000000000");
  });

  it("Starting Round One", async () => {
    const tx = await program.methods
      .startNextRound()
      .accounts({
        presaleInfo: pda.presalePDA,
        tokenVault: pda.dlVault,
        admin: admin.publicKey,
        mintOfTokenProgramSent: dlAddress,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();
    console.log(`Round One has been started successfully`, tx);

    const [, dlVaultBalancePost] = await readAccount(pda.dlVault, provider);
    console.log("Vault Balance: " + dlVaultBalancePost);

    assert.equal(dlVaultBalancePost, "6000000000000");

    console.log(
      "Presale Stage",
      (
        await program.account.preSaleDetails.fetch(pda.presalePDA)
      ).stage.toString()
    );
  });

  it("Starting Round Two", async () => {
    const tx = await program.methods
      .startNextRound()
      .accounts({
        presaleInfo: pda.presalePDA,
        tokenVault: pda.dlVault,
        admin: admin.publicKey,
        mintOfTokenProgramSent: dlAddress,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    console.log(`Round two has been started successfully`, tx);

    const [, dlVaultBalancePost] = await readAccount(pda.dlVault, provider);
    console.log("Vault Balance: " + dlVaultBalancePost);

    assert.equal(dlVaultBalancePost, "5000000000000");

    console.log(
      "Presale Stage",
      (
        await program.account.preSaleDetails.fetch(pda.presalePDA)
      ).stage.toString()
    );
  });

  it("Starting Round Three", async () => {
    const tx = await program.methods
      .startNextRound()
      .accounts({
        presaleInfo: pda.presalePDA,
        tokenVault: pda.dlVault,
        admin: admin.publicKey,
        mintOfTokenProgramSent: dlAddress,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    console.log(`Round three has been started successfully`, tx);

    const [, dlVaultBalancePost] = await readAccount(pda.dlVault, provider);
    console.log("Vault Balance: " + dlVaultBalancePost);

    assert.equal(dlVaultBalancePost, "3000000000000");

    console.log(
      "Presale Stage",
      (
        await program.account.preSaleDetails.fetch(pda.presalePDA)
      ).stage.toString()
    );
  });

  it("Ending Presale", async () => {
    const tx = await program.methods
      .startNextRound()
      .accounts({
        presaleInfo: pda.presalePDA,
        tokenVault: pda.dlVault,
        admin: admin.publicKey,
        mintOfTokenProgramSent: dlAddress,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    console.log(`Presale has been ended`, tx);

    try {
      const [info, balance] = await readAccount(pda.dlVault, provider);
      console.log("===========>", info, balance);
      return assert.fail("Account should be closed");
    } catch (e) {
      assert.equal(
        e.message,
        "Cannot read properties of null (reading 'data')"
      );
    }

    console.log(
      "Presale Stage",
      (
        await program.account.preSaleDetails.fetch(pda.presalePDA)
      ).stage.toString()
    );
  });
});
