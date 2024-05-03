const {
  Connection,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  StakeProgram,
  Authorized,
  Lockup,
  sendAndConfirmTransaction,
  PublicKey,
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
  let stakeBalance = await connection.getBalance(stakeAccount.publicKey);
  console.log("Stake Account Balance", stakeBalance / LAMPORTS_PER_SOL);
  let stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey);
  console.log("Stake Account Status Before", stakeStatus.state);

  const validators = await connection.getVoteAccounts();
  const selectedValidators = validators.current[0]; //choosing the first one
  const selectedValidatorPubKey = new PublicKey(selectedValidators.votePubkey);
  const delegateTx = StakeProgram.delegate({
    stakePubkey: stakeAccount.publicKey,
    authorizedPubkey: wallet.publicKey,
    votePubkey: selectedValidatorPubKey,
  });
  const delegateTxId = await sendAndConfirmTransaction(connection, delegateTx, [
    wallet,
  ]);
  console.log(
    `Staked Account Delegated to ${selectedValidatorPubKey}, Tx Id: ${delegateTxId}`
  );
  stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey);
  console.log("Stake Account Status After", stakeStatus.state);

  const deactivateTx = StakeProgram.deactivate({
    stakePubkey: stakeAccount.publicKey,
    authorizedPubkey: wallet.publicKey,
  });

  const deactivateTxId = await sendAndConfirmTransaction(
    connection,
    deactivateTx,
    [wallet]
  );
  console.log(`Stake Account Deactivated. Tx Id: ${deactivateTxId}`);

  stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey);
  console.log("Stake Account Status After", stakeStatus.state);
  stakeBalance = await connection.getBalance(stakeAccount.publicKey);
  const withdrawTx = StakeProgram.withdraw({
    stakePubkey: stakeAccount.publicKey,
    authorizedPubkey: wallet.publicKey,
    toPubkey: wallet.publicKey,
    lamports: stakeBalance,
  });

  const withdrawTxId = await sendAndConfirmTransaction(connection, withdrawTx, [
    wallet,
  ]);
  console.log(`Stake Account Withdrawn. Tx Id: ${withdrawTxId}`);
  stakeBalance = await connection.getBalance(stakeAccount.publicKey);
  console.log(
    "Stake Account Balance After Withdraw",
    stakeBalance / LAMPORTS_PER_SOL
  );
};

const runMain = async () => {
  try {
    await main();
  } catch (e) {
    console.log(e);
  }
};

runMain();
