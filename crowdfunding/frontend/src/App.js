import "./App.css";
import { useEffect, useState } from "react";
import idl from "./utils/idl.json";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import {
  Program,
  AnchorProvider,
  web3,
  utils,
  BN,
} from "@project-serum/anchor";
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

  const getProvider = () => {
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

  const createCompaign = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log(program, "program");
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
      <button onClick={createCompaign}>Create Compaign</button>
    </div>
  );
}

export default App;
