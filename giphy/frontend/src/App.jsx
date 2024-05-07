import { useEffect, useState } from "react";
import {
  Connection,
  PublicKey,
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";
import { AnchorProvider, Program, web3 } from "@project-serum/anchor";
import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import idl from "./utils/idl.json";
import kp from "./utils/keypair.json";
import { Buffer } from "buffer";
// Constants
const { Keypair } = web3;
const { solana } = window;
window.Buffer = Buffer;
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
let baseAccount = Keypair.fromSecretKey(secret);
const programID = new PublicKey(idl.address);
const network = clusterApiUrl("devnet");
const TWITTER_HANDLE = "_buildspace";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const opts = {
  preflightCommitment: "processed",
};
const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [userGif, setUserGif] = useState(null);

  // const test_gif = [
  //   "https://i.gifer.com/kkd.gif",
  //   "https://i.gifer.com/XjD.gif",
  //   "https://i.gifer.com/7V7m.gif",
  // ];
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(
      connection,
      currentAccount,
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

  const sendGif = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      await program.rpc.addGif(inputVal, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      await getGifList();
      setInputVal("");
    } catch (err) {
      console.log(err);
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

  const createGifAccount = async () => {
    try {
      const provider = getProvider();

      const program = new Program(idl, programID, provider);
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },

        signers: [baseAccount],
      });
      console.log("Created a base Account", baseAccount.publicKey.toString());
      await getGifList();
    } catch (err) {
      console.log(err.message);
    }
  };

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );
      console.log(account, "rabeb");
      setUserGif(account.gitList);
    } catch (err) {
      console.log(err.message);
      setUserGif("");
    }
  };

  useEffect(() => {
    if (currentAccount) {
      console.log("Fetching GIF List...");
      getGifList();
    }
  }, [currentAccount]);
  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>

          {!currentAccount ? (
            <button
              className="cta-button connect-wallet-button"
              onClick={connectWallet}
            >
              Connect Wallet
            </button>
          ) : !userGif ? (
            <div className="connected-container">
              <button
                className="cta-button submit-gif-button"
                onClick={createGifAccount}
              >
                Do One-Time Initialization for GIF Program Account
              </button>
            </div>
          ) : (
            <div className="connected-container">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendGif();
                }}
              >
                <input
                  type="text"
                  className="search-input"
                  placeholder="Enter GIFs link!"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                />
                <button
                  type="submit"
                  className="cta-button submit-gif-button"
                  disabled={inputVal == ""}
                >
                  Submit
                </button>
              </form>
              <div className="gif-grid">
                {userGif &&
                  userGif.map((item, index) => (
                    <div className="gif-item" key={index}>
                      <img alt="gif" src={item} />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`Adapted from @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
