import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import React from "react";

const WalletButton = () => {
  return (
    <div>
      {" "}
      <WalletMultiButton />
      <h1>Hello Solana</h1>
    </div>
  );
};

export default WalletButton;
