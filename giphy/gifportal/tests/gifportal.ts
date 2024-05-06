import * as anchor from "@coral-xyz/anchor";
const assert = require("assert");
const { SystemProgram } = anchor.web3;

describe("Giphy", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Gifportal;
  const giphy = anchor.web3.Keypair.generate();

  it("Creates a Giphy", async () => {
    const tx = await program.rpc.startStuffOff({
      accounts: {
        baseAccount: giphy.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [giphy],
    });
    let account = await program.account.baseAccount.fetch(giphy.publicKey);
    assert.ok(account.totalGifs.eq(new anchor.BN(0)));
  });

  it("Add Gif", async () => {
    await program.rpc.addGif("https://i.gifer.com/Be.gif", {
      accounts: {
        baseAccount: giphy.publicKey,
        user: provider.wallet.publicKey,
      },
    });
    const account = await program.account.baseAccount.fetch(giphy.publicKey);
    console.log("Gif List", account.gifList);
    assert.ok(account.totalGifs.eq(new anchor.BN(1)));
  });
});
