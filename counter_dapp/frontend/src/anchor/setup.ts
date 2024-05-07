import { IdlAccounts, Program } from "@coral-xyz/anchor";
import { IDL, Counter } from "./idl"
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { Buffer } from 'buffer';
 window.Buffer = Buffer;
const programId = new PublicKey("5MXRhERjSZEGHKWQjqn6e6Z9iJsLTT32551Jw9SzUeiZ");
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
// Initialize the program interface with the IDL, program ID, and connection.
// This setup allows us to interact with the on-chain program using the defined interface.
export const program = new Program<Counter>(IDL, programId, {
    connection,
  });
   
// To derive a PDA, we need:
// - the seeds - think of this like an ID or key (in a key-value store)
// - the program address of the program the PDA belongs to
 
// This gives us the mintPDA that we'll reference when minting stuff
export const [mintPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("mint")],
  program.programId,
);
 
// Similarly, derive a PDA for when we increment the counter, using "counter" as the seed
export const [counterPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("counter")],
  program.programId,
);
 
// This is just a TypeScript type for the Counter data structure based on the IDL
// We need this so TypeScript doesn't yell at us
export type CounterData = IdlAccounts<Counter>["counter"];