For Localnet
solana config set --url http://localhost:8899

For Devnet
solana config set --url http://localhost:8899

For getting events in the terminal
solana logs -u localhost/devnet <PROGRAM_ID>

For running solana validator node on localhost
solana-test-validator

For testing on the validator node on localhost
anchor test --skip-local-validator