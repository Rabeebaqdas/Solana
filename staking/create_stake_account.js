const {
  Connection,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  StakeProgram,
  Authorized,
  Lockup,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");

const main = async () => {
  const connection = new Connection(clusterApiUrl("devnet"), "processed");
  const wallet = Keypair.generate();
  const airdropSignature = await connection.requestAirdrop(
    wallet.publicKey,
    1 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Wallet Balance: ", balance);
  const stakeAccount = Keypair.generate();
  const minimumRent = await connection.getMinimumBalanceForRentExemption(
    StakeProgram.space
  );
  const amountUserWantsToStake = 0.5 * LAMPORTS_PER_SOL;
  const amountToStake = minimumRent + amountUserWantsToStake;
  const createTx = StakeProgram.createAccount({
    authorized: new Authorized(wallet.publicKey, wallet.publicKey),
    fromPubkey: wallet.publicKey,
    lamports: amountToStake,
    lockup: new Lockup(0, 0, wallet.publicKey),
    stakePubkey: stakeAccount.publicKey,
  });
  const createStakeAccountTxId = await sendAndConfirmTransaction(
    connection,
    createTx,
    [wallet, stakeAccount]
  );
  console.log("Stake Account created. Tx Id : ", createStakeAccountTxId);
  const stakeBalance = await connection.getBalance(stakeAccount.publicKey);
  console.log("Stake Account Balance", stakeBalance / LAMPORTS_PER_SOL);
  const stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey);
  console.log("Stake Account Status", stakeStatus);
};
const runMain = async () => {
  try {
    await main();
  } catch (e) {
    console.log(e);
  }
};

runMain();
