use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{CloseAccount, Mint, Token, TokenAccount, Transfer, transfer},
};
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod safepay {
    use super::*;

    pub fn initialize_new_grant(
        ctx: Context<InitializeNewGrant>,
        application_idx: u64,
        amount: u64,
     ) -> Result<()> {
        let details = &mut ctx.accounts.application_state;
        details.idx = application_idx;
        details.amount_tokens = amount;
        details.user_sending = ctx.accounts.user_sending.key().clone();
        details.user_receiving = ctx.accounts.user_receiving.key().clone();
        details.mint_of_token_being_sent = ctx.accounts.mint_of_token_being_sent.key().clone();
        details.escrow_wallet = ctx.accounts.escrow_wallet_state.key().clone();

        msg!("Initialized new Safe Transfer instance for {}", amount);

        // This specific step is very different compared to Ethereum. In Ethereum, accounts need to first set allowances towards
        // a specific contract (like ZeroEx, Uniswap, Curve..) before the contract is able to withdraw funds. In this other case,
        // the SafePay program can use Bob's signature to "authenticate" the `transfer()` instruction sent to the token contract.
        // let bump_vector = state_bump.to_le_bytes();
        // let mint_of_token_being_sent_pk = ctx.accounts.mint_of_token_being_sent.key().clone();
        // let application_idx_bytes: [u8; 8] = application_idx.to_le_bytes();
        // let bump_stake = ctx.bumps.application_state;

        // let signer: &[&[&[u8]]] = &[&[
        //     b"state".as_ref(),
        //     ctx.accounts.user_sending.key.as_ref(),
        //     ctx.accounts.user_receiving.key.as_ref(),
        //     mint_of_token_being_sent_pk.as_ref(),
        //     application_idx_bytes.as_ref(),
        //     &[bump_stake],
        // ]];

        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from : ctx.accounts.wallet_to_withdraw_from.to_account_info(),
                    to: ctx.accounts.escrow_wallet_state.to_account_info(),
                    authority: ctx.accounts.user_sending.to_account_info(),
                }
            ),
            amount
        )?;
        details.stage = Stage::FundsDeposited.to_code();

        Ok(())
    }

}

#[derive(Clone, Copy, PartialEq)]
pub enum Stage {
    // Safe Pay withdrew funds from Alice and deposited them into the escrow wallet
    FundsDeposited,

    // {from FundsDeposited} Bob withdrew the funds from the escrow. We are done.
    EscrowComplete,

    // {from FundsDeposited} Alice pulled back the funds
    PullBackComplete,
}
impl Stage {
    fn to_code(&self) -> u8 {
        match self {
            Stage::FundsDeposited => 1,
            Stage::EscrowComplete => 2,
            Stage::PullBackComplete => 3,
        }
    }

    fn from (val: u8) -> Result<Stage> {
        match val {
            1 => Ok(Stage::FundsDeposited),
            2 => Ok(Stage::EscrowComplete),
            3 => Ok(Stage::PullBackComplete),
            unknown_value => {
                msg!("Unknown stage: {}", unknown_value); 
                Err(ErrorCode::StageInvalid.into())},
        }
    }
}

#[derive(Accounts)]
#[instruction(application_idx: u64)]
pub struct InitializeNewGrant<'info> {
    // Derived PDAs
    #[account(
        init,
        payer = user_sending,
        seeds=[b"state".as_ref(), user_sending.key().as_ref(), user_receiving.key.as_ref(), mint_of_token_being_sent.key().as_ref(), application_idx.to_le_bytes().as_ref()],
        bump,
        space = 8 + std::mem::size_of::<Details>()
    )]
    application_state: Account<'info, Details>,

    #[account(
        init,
        payer = user_sending,
        seeds=[b"wallet".as_ref(), user_sending.key().as_ref(), user_receiving.key.as_ref(), mint_of_token_being_sent.key().as_ref(), application_idx.to_le_bytes().as_ref()],
        bump,
        token::mint = mint_of_token_being_sent,
        token::authority = application_state,
    )]
    escrow_wallet_state: Account<'info, TokenAccount>,

    // Users and accounts in the system
    #[account(mut)]
    user_sending: Signer<'info>, // Alice
    user_receiving: AccountInfo<'info>,             // Bob
    mint_of_token_being_sent: Account<'info, Mint>, // USDC

    // Alice's USDC wallet that has already approved the escrow wallet
    #[account(
            mut,
            constraint=wallet_to_withdraw_from.owner == user_sending.key(),
            constraint=wallet_to_withdraw_from.mint == mint_of_token_being_sent.key()
        )]
    wallet_to_withdraw_from: Account<'info, TokenAccount>,

    // Application level accounts
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

#[account]
pub struct Details {
    // A primary key that allows us to derive other important accounts
    idx: u64,

    // Alice
    user_sending: Pubkey,

    // Bob
    user_receiving: Pubkey,

    // The Mint of the token that Alice wants to send to Bob
    mint_of_token_being_sent: Pubkey,

    // The escrow wallet
    escrow_wallet: Pubkey,

    // The amount of tokens Alice wants to send to Bob
    amount_tokens: u64,

    // An enumm that is to represent some kind of state machine
    stage: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Wallet to withdraw from is not owned by owner")]
    WalletToWithdrawFromInvalid,
    #[msg("State index is inconsistent")]
    InvalidStateIdx,
    #[msg("Delegate is not set correctly")]
    DelegateNotSetCorrectly,
    #[msg("Stage is invalid")]
    StageInvalid
}
