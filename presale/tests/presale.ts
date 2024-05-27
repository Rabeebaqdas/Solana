import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import * as spl from "@solana/spl-token";
import { Presale } from "../target/types/presale";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
describe("presale", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  let userAssociatedTokenAccount;    
  anchor.setProvider(provider);
  const payer = provider.wallet as anchor.Wallet;
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const usdcmintKeyPair = Keypair.generate();
  const dlmintKeyPair = Keypair.generate();
  const program = anchor.workspace.Presale as Program<Presale>;

  async function createMintToken(token: string) {
    if (token == "usdc") {
      const usdcmint = await createMint(
        connection,
        payer.payer,
        payer.publicKey,
        payer.publicKey,
        9,
        usdcmintKeyPair
      );
      console.log(usdcmint);
      console.log("USDC token",usdcmint);

      return usdcmint;
    } else {
      const tokenmint = await createMint(
        connection,
        payer.payer,
        payer.publicKey,
        payer.publicKey,
        9,
        dlmintKeyPair
      );
      console.log("Decrypted Labs token",tokenmint);

      //making associated token account to hold the user's tokens
       userAssociatedTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer.payer,
        tokenmint,
        payer.publicKey
      );

      mintTo(
        connection,
        payer.payer,
        tokenmint,
        userAssociatedTokenAccount.address,
        payer.publicKey,
        1000000000000
      );
      console.log(
        `[${
          userAssociatedTokenAccount.address
        }] New associated account for mint ${tokenmint.toBase58()}`
      );
      return tokenmint;
    }


  }

  // const readAccount = async (
  //   accountPublicKey: anchor.web3.PublicKey,
  //   provider: anchor.Provider
  // ): Promise<[spl.RawAccount, string]> => {
  //   const tokenInfoLol = await provider.connection.getAccountInfo(
  //     accountPublicKey
  //   );

  //   const data = Buffer.from(tokenInfoLol.data);
  //   const accountInfo: spl.RawAccount = spl.AccountLayout.decode(data);
  //   return [accountInfo, accountInfo.amount.toString()];
  // };

  it("Is initialized!", async () => {
    let usdcmint = await createMintToken("usdc");
    let tokenmint = await createMintToken("DecryptedLabs");
    
    // getting the pda of users stake info account
    let [presaleInfo] = PublicKey.findProgramAddressSync(
      [Buffer.from("presale_info")],
      program.programId
    );

    // getting the pda of users stake info account
    let [usdcVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("usdc_vault")],
      program.programId
    );

    // getting the pda of users stake info account
    let [tokenVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault")],
      program.programId
    );
    console.log("Done with minting")

    // Add your test here.
    const tx = await program.methods
      .initialize(
        new anchor.BN(10000000000),
        new anchor.BN(50000000000),
        new anchor.BN(1000000000000)
      )
      .accounts({
        presaleInfo: presaleInfo,
        usdcVault: usdcVault,
        tokenVault: tokenVault,
        mintOfTokenUserSend: usdcmint,  
        mintOfTokenProgramSent: tokenmint,  
        walletOfDepositor: userAssociatedTokenAccount.address,  
        admin: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([payer.payer])
      .rpc();
    console.log("Your transaction signature", tx);
  });
});
