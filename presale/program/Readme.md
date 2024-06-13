For Localnet
solana config set --url http://localhost:8899

For Devnet
solana config set --url https://api.devnet.solana.com

For generating new program ID
solana-keygen new --outfile target/deploy/your_program_name.json

For airdrop sol on devnet
solana airdrop <amount> <recipient_address>
e.g solana airdrop 5 DXFUekPb7o9xLmABqLrMjroqvUD11qwmPEkxKK6DpevG

For getting events in the terminal
solana logs -u localhost/devnet <PROGRAM_ID>

For running solana validator node on localhost
solana-test-validator

For testing on the validator node on localhost
anchor test --skip-local-validator