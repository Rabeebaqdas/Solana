import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { dlVault, presalePDA, program, usdcVault } from "../anchor/setup";
import { web3, BN, AnchorProvider } from "@project-serum/anchor";
import { Buffer } from "buffer";
import * as spl from "@solana/spl-token";
import {
  Connection,
  clusterApiUrl,
  ConfirmOptions,
  PublicKey,
} from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import {
  createMint,
  // getOrCreateAssociatedTokenAccount,
  // mintTo,
} from "@solana/spl-token";
const { SystemProgram, Keypair } = web3;
window.Buffer = Buffer;
interface PDAParameters {
  firstAllocation: BN;
  secondAllocation: BN;
  thirdAllocation: BN;
  roundOnePrice: BN;
  roundTwoPrice: BN;
  roundThreePrice: BN;
  usdcAddress: web3.PublicKey;
  dlAddress: web3.PublicKey;
}
const opts = { preflightCommitment: "processed" };
export default function InitializedButton() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);
  const [inputVal] = useState<PDAParameters>({
    firstAllocation: new BN(1000 * web3.LAMPORTS_PER_SOL),
    secondAllocation: new BN(2000 * web3.LAMPORTS_PER_SOL),
    thirdAllocation: new BN(3000 * web3.LAMPORTS_PER_SOL),
    roundOnePrice: new BN(1 * web3.LAMPORTS_PER_SOL),
    roundTwoPrice: new BN(2 * web3.LAMPORTS_PER_SOL),
    roundThreePrice: new BN(3 * web3.LAMPORTS_PER_SOL),
    usdcAddress: new PublicKey("DwvyvgXtxsug14oTKiRawTbuirQjkfUUbZBsbqG1PntG"),
    dlAddress: new PublicKey("4nKi4k91QGkbetCA4FuRVB9PxBZpJaNSnGCKstdSfGoP"),
  });

  const getProvider = () => {
    const provider = new AnchorProvider(
      connection,
      window?.solana,
      opts?.preflightCommitment as ConfirmOptions
    );
    return provider;
  };

  const createToken = async (): Promise<web3.PublicKey | undefined> => {
    try {
      const mintAddress = Keypair.generate();

      // const payer = Keypair.generate();
      const payer = Keypair.fromSecretKey(
        new Uint8Array([
          82, 41, 172, 138, 53, 118, 134, 8, 140, 80, 64, 128, 107, 4, 200, 93,
          230, 226, 1, 56, 57, 124, 67, 220, 141, 31, 230, 129, 115, 41, 178,
          212, 155, 103, 213, 205, 144, 42, 89, 127, 85, 105, 223, 89, 213, 175,
          213, 238, 109, 176, 118, 29, 145, 226, 61, 215, 17, 24, 222, 253, 168,
          108, 22, 114,
        ])
      );

      console.log("============>", { payer });

      // const fromAirdropSignature = await connection.requestAirdrop(
      //   payer.publicKey,
      //   web3.LAMPORTS_PER_SOL
      // );

      // // Wait for airdrop confirmation
      // await connection.confirmTransaction({
      //   signature: fromAirdropSignature,
      //   ...(await connection.getLatestBlockhash()),
      // });

      // making USDC token
      const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        payer.publicKey,
        9,
        mintAddress
      );

      console.log(mint);

      console.log(`[${mintAddress.publicKey}] Created new mint account`);
      return mintAddress.publicKey;
    } catch (err) {
      console.log(err);
    }
  };

  // const InitializeProgram = async () => {
  //   if (!publicKey) return;

  //   setIsLoading(true);

  //   try {
  //     // Create a transaction to invoke the increment function
  //     const transaction = await program.methods
  //       .initialize(
  //         inputVal.firstAllocation,
  //         inputVal.secondAllocation,
  //         inputVal.thirdAllocation,
  //         inputVal.roundOnePrice,
  //         inputVal.roundTwoPrice,
  //         inputVal.roundThreePrice
  //       )
  //       .accounts({
  //         presaleInfo: presalePDA,
  //         usdcVault: usdcVault,
  //         tokenVault: dlVault,
  //         admin: publicKey,
  //         walletOfDepositor: adminDLWallet,
  //         mintOfTokenUserSend: usdcAddress,
  //         mintOfTokenProgramSent: dlAddress,
  //         systemProgram: SystemProgram.programId,
  //         tokenProgram: spl.TOKEN_PROGRAM_ID,
  //       }) // This takes no arguments so we don't need to pass anything
  //       .transaction();

  //     const transactionSignature = await sendTransaction(
  //       transaction,
  //       connection
  //     );

  //     console.log(
  //       `View on explorer: https://solana.fm/tx/${transactionSignature}?cluster=devnet-alpha`
  //     );
  //   } catch (error) {
  //     console.log(error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  useEffect(() => {}, []);

  return (
    <button className="w-24" onClick={createToken} disabled={!publicKey}>
      {isLoading ? "Loading" : "Create Token"}
    </button>
  );
}
