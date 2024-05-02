import "./App.css";
import { useEffect, useState } from "react";
import idl from "./utils/idl.json";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, web3, utils } from "@project-serum/anchor";
import { Buffer } from "buffer";
window.Buffer = Buffer;
const { solana } = window;
const programID = new PublicKey(idl.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed",
};
const { SystemProgram } = web3;
function App() {
  const [currentAccount, setCurrentAccount] = useState("");
  const [campaigns, setCampaigns] = useState([]);

  const getProvider = () => {
    //Creating a provider, the provider is authenication connection to solana
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(
      connection,
      solana,
      opts.preflightCommitment
    );
    return provider;
  };

  const checkIsWalletConnected = async () => {
    try {
      if (!solana) return alert("please install Phantom");
      if (solana.isPhantom) {
        const response = await solana.connect({ onlyIfTrusted: true });
        setCurrentAccount(response?.publicKey?.toString());
      }
    } catch (err) {
      setCurrentAccount("");
      console.log(err.message);
    }
  };

  const connectWallet = async () => {
    try {
      if (!solana) return alert("Please install Metamask");
      const response = await solana.connect();
      setCurrentAccount(response.publicKey.toString());
    } catch (err) {
      console.log(err.message);
      throw new Error("No solana object");
    }
  };

  const getCompaigns = async () => {
    try {
      const connection = new Connection(network, opts.preflightCommitment);
      const provider = getProvider();

      const program = new Program(idl, programID, provider);
      Promise.all(
        (await connection.getProgramAccounts(programID)).map(
          async (campaign) => ({
            ...(await program.account.campaign.fetch(campaign.pubkey)),
            pubkey: campaign.pubkey,
          })
        )
      ).then((campaign) => setCampaigns(campaign));
    } catch (err) {
      console.log(err);
    }
  };

  const createCompaign = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log(programID, "program");
      const [campaign] = await PublicKey.findProgramAddress(
        [
          utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
          provider.wallet.publicKey.toBuffer(),
        ],
        program.programId
      );
      await program.rpc.create("1st campaign", "test description", {
        accounts: {
          campaign,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      });
      console.log(campaign.toString(), "campaign created successfully");
    } catch (err) {
      console.log(err.message);
    }
  };

  useEffect(() => {
    if (solana) {
      const onLoad = async () => {
        await checkIsWalletConnected();
      };
      window.addEventListener("load", onLoad);
      return () => {
        window.removeEventListener("load", onLoad);
      };
    }
  }, []);
  return (
    <div className="App">
      <button onClick={connectWallet} disabled={currentAccount !== ""}>
        {currentAccount !== "" ? currentAccount : "Connect Wallet"}
      </button>
      <br />
      <button onClick={createCompaign}>Create Compaign</button>
      <button onClick={getCompaigns}>Get Compaigns List</button>

      <br />
      {campaigns.map((campaign) => (
        <>
          <p>Campaign ID: {campaign.pubkey.toString()}</p>
          <p>Campaign Name: {campaign.name}</p>
          <p>Campaign ID: {campaign.description}</p>
          <p>
            Amount Donated:{" "}
            {(campaign.amountDonated / web3.LAMPORTS_PER_SOL).toString()}
          </p>
          <br />
        </>
      ))}
    </div>
  );
}

export default App;
