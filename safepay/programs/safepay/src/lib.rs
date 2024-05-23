use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{CloseAccount, Mint, Token, TokenAccount, Transfer},
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

        
        Ok(())
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
