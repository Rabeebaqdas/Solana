const { Connection, clusterApiUrl } = require("@solana/web3.js");

const main = async () => {
  const connection = new Connection(clusterApiUrl("devnet"), "processed");
  const {current, delinquent} = await connection.getVoteAccounts();
  console.log("Total: ", current.concat(delinquent).length);
  console.log("Current: ", current.length);
  console.log("Validator Details: ", current[0]);

};
const runMain = async () => {
  try {
    await main();
  } catch (e) {
    console.log(e);
  }
};

runMain();
