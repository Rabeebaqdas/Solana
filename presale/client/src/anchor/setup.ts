import { IdlAccounts, Program } from "@coral-xyz/anchor";
import { IDL, Presale } from "./idl";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
window.Buffer = Buffer;
const programId = new PublicKey("HCXo1ZoY2ALW9dWDBjU1NfwHoaEEDsZ9g1FwrNfRC7GC");
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
// Initialize the program interface with the IDL, program ID, and connection.
// This setup allows us to interact with the on-chain program using the defined interface.
export const program = new Program<Presale>(IDL, programId, {
  connection,
});

// To derive a PDA, we need:
// - the seeds - think of this like an ID or key (in a key-value store)
// - the program address of the program the PDA belongs to

export const [presalePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("presale_info")],
  program.programId
);

export const [usdcVault] = PublicKey.findProgramAddressSync(
  [Buffer.from("usdc_vault")],
  program.programId
);

export const [dlVault] = PublicKey.findProgramAddressSync(
  [Buffer.from("token_vault")],
  program.programId
);

// This is just a TypeScript type for the Presale data structure based on the IDL
// We need this so TypeScript doesn't yell at us
export type PresaleData = IdlAccounts<Presale>["presale"];
