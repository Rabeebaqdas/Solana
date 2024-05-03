const { Connection, clusterApiUrl, PublicKey } = require("@solana/web3.js");

const main = async () => {
  const connection = new Connection(clusterApiUrl("devnet"), "processed");
  const STAKE_PROGRAM_ID = new PublicKey(
    "Stake11111111111111111111111111111111111111"
  );

  //any validator public key
  const VOTE_PUBLIC_KEY = "23AoPQc3EPkfLWb14cKiWNahh1H9rtb3UBk8gWseohjF";
  const accounts = await connection.getParsedProgramAccounts(STAKE_PROGRAM_ID, {
    filters: [
      {
        dataSize: 200,
      },
      {
        memcmp: {
          offset: 124,
          bytes: VOTE_PUBLIC_KEY,
        },
      },
    ],
  });
  console.log(
    `Total numbers of delegators found for ${VOTE_PUBLIC_KEY} are: ${accounts.length}`
  );
  console.log("================================================");
  if (accounts.length) {
    console.log("Sample Delegator: ", JSON.stringify(accounts[0])); // getting info of one delegator
  }
};

const runMain = async () => {
  try {
    await main();
  } catch (e) {
    console.log(e);
  }
};

runMain();
