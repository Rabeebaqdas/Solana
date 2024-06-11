import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { program, presalePDA, PresaleData } from "../anchor/setup";

export default function PreSaleState() {
  const { connection } = useConnection();
  const [preSale, setPreSale] = useState<PresaleData | null>(null);

  useEffect(() => {
    // Fetch initial account data
    program.account.preSaleDetails.fetch(presalePDA).then((data) => {
      setPreSale(data);
    });

    // Subscribe to account change
    const subscriptionId = connection.onAccountChange(
      // The address of the account we want to watch
      presalePDA,
      // callback for when the account changes
      (accountInfo) => {
        setPreSale(program.coder.accounts.decode("presale", accountInfo.data));
      }
    );

    return () => {
      // Unsubscribe from account change
      connection.removeAccountChangeListener(subscriptionId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program]);
  console.log(preSale);
  // Render the value of the PreSale
  return (
    <p className="text-lg">
      Round:{" "}
      {preSale === null
        ? "Presale Not Started Yet"
        : preSale?.round?.toString()}
    </p>
  );
}
