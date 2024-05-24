use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{close_account, transfer, CloseAccount, Mint, Token, TokenAccount, Transfer},
};
declare_id!("GahQHYEwx2KVdK2zy3sY8CPak8y63XesQLHN9Z7EhgsS");

fn transfer_escrow_out<'info>(
    user_sending: AccountInfo<'info>,
    user_receiving: AccountInfo<'info>,
    mint_of_token_being_sent: AccountInfo<'info>,
    escrow_wallet: &mut Account<'info, TokenAccount>,
    application_idx: u64,
    state: AccountInfo<'info>,
    state_bump: u8,
    token_program: AccountInfo<'info>,
    destination_wallet: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let mint_of_token_being_sent_pk = mint_of_token_being_sent.key().clone();
    let application_idx_bytes: [u8; 8] = application_idx.to_le_bytes();
    let bump_application_state = state_bump;
    let signer: &[&[&[u8]]] = &[&[
        b"state".as_ref(),
        user_sending.key.as_ref(),
        user_receiving.key.as_ref(),
        mint_of_token_being_sent_pk.as_ref(),
        application_idx_bytes.as_ref(),
        &[bump_application_state],
    ]];

    transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Transfer {
                from: escrow_wallet.to_account_info(),
                to: destination_wallet,
                authority: state.to_account_info(),
            },
            signer,
        ),
        amount,
    )?;

    // Use the `reload()` function on an account to reload it's state. Since we performed the
    // transfer, we are expecting the `amount` field to have changed.
    let should_close = {
        escrow_wallet.reload()?;
        escrow_wallet.amount == 0
    };

    if should_close {
        let ca = CloseAccount {
            account: escrow_wallet.to_account_info(),
            destination: user_sending.to_account_info(),
            authority: state.to_account_info(),
        };

        close_account(CpiContext::new_with_signer(
            token_program.to_account_info(),
            ca,
            signer,
        ))?;
    }

    Ok(())
}

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

        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.wallet_to_withdraw_from.to_account_info(),
                    to: ctx.accounts.escrow_wallet_state.to_account_info(),
                    authority: ctx.accounts.user_sending.to_account_info(),
                },
            ),
            amount,
        )?;
        details.stage = Stage::FundsDeposited.to_code();

        Ok(())
    }

    pub fn complete_grant(ctx: Context<CompleteGrant>, application_idx: u64) -> Result<()> {
        if Stage::from(ctx.accounts.application_state.stage)? != Stage::FundsDeposited {
            msg!(
                "Stage is invalid, state stage is {}",
                ctx.accounts.application_state.stage
            );
            return Err(ErrorCode::StageInvalid.into());
        }

        transfer_escrow_out(
            ctx.accounts.user_sending.to_account_info(),
            ctx.accounts.user_receiving.to_account_info(),
            ctx.accounts.mint_of_token_being_sent.to_account_info(),
            &mut ctx.accounts.escrow_wallet_state,
            application_idx,
            ctx.accounts.application_state.to_account_info(),
            ctx.bumps.application_state,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.wallet_to_deposit_to.to_account_info(),
            ctx.accounts.application_state.amount_tokens,
        )?;

        let state = &mut ctx.accounts.application_state;
        state.stage = Stage::EscrowComplete.to_code();
        Ok(())
    }

    pub fn pull_back(ctx: Context<PullBackFunds>, application_idx: u64) -> Result<()> {
        let current_stage = Stage::from(ctx.accounts.application_state.stage)?;
        let is_valid_stage =
            current_stage == Stage::FundsDeposited || current_stage == Stage::PullBackComplete;
        if !is_valid_stage {
            msg!(
                "Stage is invalid, state stage is {}",
                ctx.accounts.application_state.stage
            );
            return Err(ErrorCode::StageInvalid.into());
        }

        transfer_escrow_out(
            ctx.accounts.user_sending.to_account_info(),
            ctx.accounts.user_receiving.to_account_info(),
            ctx.accounts.mint_of_token_being_sent.to_account_info(),
            &mut ctx.accounts.escrow_wallet_state,
            application_idx,
            ctx.accounts.application_state.to_account_info(),
            ctx.bumps.application_state,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.refund_wallet.to_account_info(),
            ctx.accounts.application_state.amount_tokens,
        )?;

        let state = &mut ctx.accounts.application_state;
        state.stage = Stage::PullBackComplete.to_code();

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

    fn from(val: u8) -> Result<Stage> {
        match val {
            1 => Ok(Stage::FundsDeposited),
            2 => Ok(Stage::EscrowComplete),
            3 => Ok(Stage::PullBackComplete),
            unknown_value => {
                msg!("Unknown stage: {}", unknown_value);
                Err(ErrorCode::StageInvalid.into())
            }
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
    /// CHECK: This field holds the account information for the receiving user.
    user_receiving: AccountInfo<'info>, // Bob
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
    // rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(application_idx: u64)]
pub struct CompleteGrant<'info> {
    // Derived PDAs
    #[account(
        mut,
        seeds=[b"state".as_ref(), user_sending.key().as_ref(), user_receiving.key.as_ref(), mint_of_token_being_sent.key().as_ref(), application_idx.to_le_bytes().as_ref()],
        bump,
        )]
    application_state: Account<'info, Details>,

    #[account(
        mut,
        seeds=[b"wallet".as_ref(), user_sending.key().as_ref(), user_receiving.key.as_ref(), mint_of_token_being_sent.key().as_ref(), application_idx.to_le_bytes().as_ref()],
        bump,
    )]
    escrow_wallet_state: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user_receiving,
        associated_token::mint = mint_of_token_being_sent,
        associated_token::authority = user_receiving,
    )]
    wallet_to_deposit_to: Account<'info, TokenAccount>, // Bob's USDC wallet (will be initialized if it did not exist)

    // Users and accounts in the system
    /// CHECK: This field holds the account information for the sender.
    #[account(mut)]
    user_sending: AccountInfo<'info>, // Alice
    #[account(mut)]
    user_receiving: Signer<'info>, // Bob
    mint_of_token_being_sent: Account<'info, Mint>, // USDC

    // Application level accounts
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
    // rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(application_idx: u64)]
pub struct PullBackFunds<'info> {
    // Derived PDAs
    #[account(
        mut,
        seeds=[b"state".as_ref(), user_sending.key().as_ref(), user_receiving.key.as_ref(), mint_of_token_being_sent.key().as_ref(), application_idx.to_le_bytes().as_ref()],
        bump,
    )]
    application_state: Account<'info, Details>,

    #[account(
    mut,
    seeds=[b"wallet".as_ref(), user_sending.key().as_ref(), user_receiving.key.as_ref(), mint_of_token_being_sent.key().as_ref(), application_idx.to_le_bytes().as_ref()],
    bump,
)]
    escrow_wallet_state: Account<'info, TokenAccount>,

    // Users and accounts in the system
    /// CHECK: This field holds the account information for the sender.
    #[account(mut)]
    user_sending: AccountInfo<'info>, // Alice
    user_receiving: Signer<'info>,                  // Bob
    mint_of_token_being_sent: Account<'info, Mint>, // USDC

    // Wallet to deposit to
    #[account(
        mut,
        constraint=refund_wallet.owner == user_sending.key(),
        constraint=refund_wallet.mint == mint_of_token_being_sent.key()
    )]
    refund_wallet: Account<'info, TokenAccount>,

    // Application level accounts
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
    // rent: Sysvar<'info, Rent>,
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
    StageInvalid,
}
