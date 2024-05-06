import { useEffect, useState } from "react";
import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";

// Constants
const TWITTER_HANDLE = "_buildspace";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const { solana } = window;
const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [userGif, setUserGif] = useState([]);

  const test_gif = [
    "https://i.gifer.com/kkd.gif",
    "https://i.gifer.com/XjD.gif",
    "https://i.gifer.com/7V7m.gif"
  ];
  // const getProvider = () => {
  //   const connection = new Connection(network, opts.preflightCommitment);
  //   const provider = new AnchorProvider(
  //     connection,
  //     solana,
  //     opts.preflightCommitment
  //   );
  //   return provider;
  // };

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
    console.log(inputVal);
    setUserGif([...userGif, inputVal]);
    setInputVal("");
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
  useEffect(() => {
    if (currentAccount) {
      console.log("Fetching GIF List...");
      setUserGif(test_gif);
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
                {userGif.map((gif) => (
                  <div className="gif-item" key={gif}>
                    <img alt="gif" src={gif} />
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
