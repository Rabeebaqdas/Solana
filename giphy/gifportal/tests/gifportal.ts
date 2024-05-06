import * as anchor from "@coral-xyz/anchor";  
const assert = require("assert");
const { SystemProgram } = anchor.web3;

describe("Giphy", async() => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Gifportal;
  const tx = await program.rpc.startStuffOff()
  console.log("Signature Tx",tx);

});