use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction::{self};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{
        burn, close_account, transfer, Burn, CloseAccount, Mint, Token, TokenAccount, Transfer,
    },
};
declare_id!("HCXo1ZoY2ALW9dWDBjU1NfwHoaEEDsZ9g1FwrNfRC7GC");

pub mod constants {
    pub const SOLANA_PRICE: u64 = 168000000000;
}
fn burn_tokens<'info>(
    mint_of_token_program_sent: AccountInfo<'info>,
    token_vault: &mut Account<'info, TokenAccount>,
    info: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    amount_to_burn: u64,
    signer: &[&[&[u8]]],
) -> Result<()> {
    burn(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Burn {
                mint: mint_of_token_program_sent.to_account_info(),
                from: token_vault.to_account_info(),
                authority: info.to_account_info(),
            },
            signer,
        ),
        amount_to_burn,
    )?;
    Ok(())
}

fn transfer_token<'info>(
    wallet_to_deposit_to: AccountInfo<'info>,
    vault: &mut Account<'info, TokenAccount>,
    info: AccountInfo<'info>,
    info_bump: u8,
    token_program: AccountInfo<'info>,
    amount_to_send: u64,
) -> Result<()> {
    let signer: &[&[&[u8]]] = &[&[b"presale_info".as_ref(), &[info_bump]]];
    transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Transfer {
                from: vault.to_account_info(),
                to: wallet_to_deposit_to.to_account_info(),
                authority: info.to_account_info(),
            },
            signer,
        ),
        amount_to_send,
    )?;
    Ok(())
}

fn close_vault<'info>(
    admin: AccountInfo<'info>,
    vault: &mut Account<'info, TokenAccount>,
    info: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    signer: &[&[&[u8]]],
) -> Result<()> {
    let should_close = {
        vault.reload()?;
        vault.amount == 0
    };
    // msg!(
    //     "Admin Balance Before {}",
    //     admin.to_account_info().lamports()
    // );
    if should_close {
        let ca = CloseAccount {
            account: vault.to_account_info(),
            destination: admin.to_account_info(),
            authority: info.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(token_program.to_account_info(), ca, signer);

        close_account(cpi_ctx)?;

        // msg!("Admin Balance After {}", admin.to_account_info().lamports());
    }
    Ok(())
}

#[program]
pub mod presale {
    use solana_program::native_token::LAMPORTS_PER_SOL;

    use super::*;

    pub fn initialize(
        ctx: Context<InitializePresale>,
        round_one_allocation: u64,
        round_two_allocation: u64,
        round_three_allocation: u64,
        round_one_price: u64,
        round_two_price: u64,
        round_three_price: u64,
    ) -> Result<()> {
        let info = &mut ctx.accounts.presale_info;
        info.round_one_allocation_remaining = round_one_allocation;
        info.round_two_allocation_remaining = round_two_allocation;
        info.round_three_allocation_remaining = round_three_allocation;
        info.round_one_price = round_one_price;
        info.round_two_price = round_two_price;
        info.round_three_price = round_three_price;
        info.owner = ctx.accounts.admin.key();

        let total_amount_to_be_deposit = (round_one_allocation
            .checked_add(round_two_allocation)
            .unwrap())
        .checked_add(round_three_allocation)
        .unwrap();

        //sending DL tokens into valut upon initialization
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.wallet_of_depositor.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.admin.to_account_info(),
                },
            ),
            total_amount_to_be_deposit,
        )?;
        msg!("Amount Deposited: {}", total_amount_to_be_deposit);
        Ok(())
    }

    pub fn start_next_round(ctx: Context<StartNextRound>) -> Result<()> {
        let info = &mut ctx.accounts.presale_info;
        let current_stage = Stage::from(info.stage)?;
        if current_stage == Stage::PresaleEnded {
            return Err(ErrorCode::PresaleEnded.into());
        }

        if current_stage != Stage::PresaleNotStartedYet {
            //checking for burning the remaining round allocation
            let info_bump = ctx.bumps.presale_info;
            let signer: &[&[&[u8]]] = &[&[b"presale_info".as_ref(), &[info_bump]]];
            if current_stage == Stage::RoundOne {
                if info.round_one_allocation_remaining != 0 {
                    burn_tokens(
                        ctx.accounts.mint_of_token_program_sent.to_account_info(),
                        &mut ctx.accounts.token_vault,
                        info.to_account_info(),
                        ctx.accounts.token_program.to_account_info(),
                        info.round_one_allocation_remaining,
                        signer,
                    )?;

                    info.round_one_allocation_remaining = 0;
                }
            } else if current_stage == Stage::RoundTwo {
                if info.round_two_allocation_remaining != 0 {
                    burn_tokens(
                        ctx.accounts.mint_of_token_program_sent.to_account_info(),
                        &mut ctx.accounts.token_vault,
                        info.to_account_info(),
                        ctx.accounts.token_program.to_account_info(),
                        info.round_two_allocation_remaining,
                        signer,
                    )?;

                    info.round_two_allocation_remaining = 0;
                }
            } else {
                if info.round_three_allocation_remaining != 0 {
                    burn_tokens(
                        ctx.accounts.mint_of_token_program_sent.to_account_info(),
                        &mut ctx.accounts.token_vault,
                        info.to_account_info(),
                        ctx.accounts.token_program.to_account_info(),
                        info.round_three_allocation_remaining,
                        signer,
                    )?;

                    info.round_three_allocation_remaining = 0;
                }

                close_vault(
                    ctx.accounts.admin.to_account_info(),
                    &mut ctx.accounts.token_vault,
                    info.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    signer,
                )?;
            }
        }

        info.stage = info.stage.checked_add(1).unwrap();

        Ok(())
    }

    pub fn buy_tokens(ctx: Context<BuyTokens>, input_amount: u64, is_native: bool) -> Result<()> {
        let info = &mut ctx.accounts.presale_info;
        let current_stage = Stage::from(info.stage)?;
        let dl_to_sent;
        let mut usdc_amount = input_amount;
        if current_stage == Stage::PresaleNotStartedYet {
            return Err(ErrorCode::PresaleNotStartedYet.into());
        }

        if current_stage == Stage::PresaleEnded {
            return Err(ErrorCode::PresaleEnded.into());
        }
        if is_native {
            // Sending SOL into pda
            let ix = system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.usdc_vault.key(),
                input_amount,
            );

            // Invoke the transfer, using the system program
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.usdc_vault.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        } else {
            transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.buyer_usdc_account.to_account_info(),
                        to: ctx.accounts.usdc_vault.to_account_info(),
                        authority: ctx.accounts.buyer.to_account_info(),
                    },
                ),
                input_amount,
            )?;
        }

        if is_native {
            usdc_amount = ((constants::SOLANA_PRICE as u128)
                .checked_mul(input_amount as u128)
                .unwrap())
            .checked_div(LAMPORTS_PER_SOL as u128)
            .unwrap() as u64;
        }

        if current_stage == Stage::RoundOne {
            // dl_to_sent = (input_amount.checked_mul(LAMPORTS_PER_SOL).unwrap())
            //     .checked_div(info.round_one_price)
            //     .unwrap();

            dl_to_sent = (usdc_amount as u128)
                .checked_mul(LAMPORTS_PER_SOL as u128)
                .unwrap()
                .checked_div(info.round_one_price as u128)
                .unwrap() as u64;

            if dl_to_sent > info.round_one_allocation_remaining {
                return Err(ErrorCode::InsufficientAllocation.into());
            }

            info.round_one_allocation_remaining = info
                .round_one_allocation_remaining
                .checked_sub(dl_to_sent)
                .unwrap();
        } else if current_stage == Stage::RoundTwo {
            dl_to_sent = (usdc_amount as u128)
                .checked_mul(LAMPORTS_PER_SOL as u128)
                .unwrap()
                .checked_div(info.round_two_price as u128)
                .unwrap() as u64;

            if dl_to_sent > info.round_two_allocation_remaining {
                return Err(ErrorCode::InsufficientAllocation.into());
            }

            info.round_two_allocation_remaining = info
                .round_two_allocation_remaining
                .checked_sub(dl_to_sent)
                .unwrap();
        } else {
            dl_to_sent = (usdc_amount as u128)
                .checked_mul(LAMPORTS_PER_SOL as u128)
                .unwrap()
                .checked_div(info.round_three_price as u128)
                .unwrap() as u64;

            if dl_to_sent > info.round_three_allocation_remaining {
                return Err(ErrorCode::InsufficientAllocation.into());
            }

            info.round_three_allocation_remaining = info
                .round_three_allocation_remaining
                .checked_sub(dl_to_sent)
                .unwrap();
        }
        transfer_token(
            ctx.accounts.wallet_to_deposit_to.to_account_info(),
            &mut ctx.accounts.token_vault,
            info.to_account_info(),
            ctx.bumps.presale_info,
            ctx.accounts.token_program.to_account_info(),
            dl_to_sent,
        )?;

        Ok(())
    }

    pub fn withdraw_usdc(ctx: Context<WithdrawUSDC>) -> Result<()> {
        let info = &mut ctx.accounts.presale_info;
        let current_stage = Stage::from(info.stage)?;
        if current_stage != Stage::PresaleEnded {
            return Err(ErrorCode::PresaleNotStartedYet.into());
        }
        let usdc_to_withdraw = ctx.accounts.usdc_vault.amount;
        transfer_token(
            ctx.accounts.usdc_wallet.to_account_info(),
            &mut ctx.accounts.usdc_vault,
            info.to_account_info(),
            ctx.bumps.presale_info,
            ctx.accounts.token_program.to_account_info(),
            usdc_to_withdraw,
        )?;
        let info_bump = ctx.bumps.presale_info;
        let signer: &[&[&[u8]]] = &[&[b"presale_info".as_ref(), &[info_bump]]];

        close_vault(
            ctx.accounts.admin.to_account_info(),
            &mut ctx.accounts.usdc_vault,
            info.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            signer,
        )?;

        Ok(())
    }
}
#[derive(Clone, Copy, PartialEq)]
pub enum Stage {
    PresaleNotStartedYet,
    RoundOne,
    RoundTwo,
    RoundThird,
    PresaleEnded,
}
impl Stage {
    fn from(val: u8) -> Result<Stage> {
        match val {
            0 => Ok(Stage::PresaleNotStartedYet),
            1 => Ok(Stage::RoundOne),
            2 => Ok(Stage::RoundTwo),
            3 => Ok(Stage::RoundThird),
            4 => Ok(Stage::PresaleEnded),
            unknown_value => {
                msg!("Unknown stage: {}", unknown_value);
                Err(ErrorCode::StageInvalid.into())
            }
        }
    }
}
#[derive(Accounts)]
pub struct InitializePresale<'info> {
    // Derived PDAs
    #[account(
        init_if_needed,
        payer = admin,
        seeds=[b"presale_info".as_ref()],
        bump,
        space = 8 + std::mem::size_of::<PreSaleDetails>()
    )]
    presale_info: Account<'info, PreSaleDetails>,

    #[account(
        init_if_needed,
        payer = admin,
        seeds=[b"usdc_vault".as_ref()],
        bump,
        token::mint = mint_of_token_user_send,   //usdc token
        token::authority = presale_info,
    )]
    usdc_vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = admin,
        seeds=[b"token_vault".as_ref()],
        bump,
        token::mint = mint_of_token_program_sent,  //DL token
        token::authority = presale_info,
    )]
    token_vault: Account<'info, TokenAccount>,

    mint_of_token_user_send: Account<'info, Mint>, // USDC
    mint_of_token_program_sent: Account<'info, Mint>, // DL token

    #[account(
        mut,
        constraint=wallet_of_depositor.owner == admin.key(),
        constraint=wallet_of_depositor.mint == mint_of_token_program_sent.key()
    )]
    wallet_of_depositor: Account<'info, TokenAccount>,

    #[account(mut)]
    admin: Signer<'info>, // The person who is initializing the presale

    // Application level accounts
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
}
#[derive(Accounts)]
pub struct StartNextRound<'info> {
    // Derived PDAs
    #[account(
       mut,
        seeds=[b"presale_info".as_ref()],
        bump
    )]
    presale_info: Account<'info, PreSaleDetails>,

    #[account(
        mut,
        seeds=[b"token_vault".as_ref()],
        bump
    )]
    token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    mint_of_token_program_sent: Account<'info, Mint>, // DL token

    #[account(mut,
         constraint = presale_info.owner == admin.key() @ ErrorCode::UnauthorizedAdmin
        )]
    admin: Signer<'info>, // The person who is initializing the presale

    token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawUSDC<'info> {
    // Derived PDAs
    #[account(
       mut,
        seeds=[b"presale_info".as_ref()],
        bump
    )]
    presale_info: Account<'info, PreSaleDetails>,

    #[account(
        mut,
        seeds=[b"usdc_vault".as_ref()],
        bump
    )]
    usdc_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    admin: Signer<'info>, // The person who is initializing the presale

    #[account(mut)]
    mint_of_token_user_send: Account<'info, Mint>, // USDC

    // Wallet to deposit to
    #[account(
        mut,
        constraint=usdc_wallet.owner == admin.key() @ ErrorCode::UnauthorizedAdmin,
        constraint=usdc_wallet.mint == mint_of_token_user_send.key()
    )]
    usdc_wallet: Account<'info, TokenAccount>, // Alice USDC wallet to withdraw funds

    token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    // Derived PDAs
    #[account(
        mut,
         seeds=[b"presale_info".as_ref()],
         bump
     )]
    presale_info: Account<'info, PreSaleDetails>,

    #[account(
         mut,
         seeds=[b"usdc_vault".as_ref()],
         bump
     )]
    usdc_vault: Account<'info, TokenAccount>,

    #[account(
         mut,
         seeds=[b"token_vault".as_ref()],
         bump
     )]
    token_vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint_of_token_program_sent,
        associated_token::authority = buyer,
    )]
    wallet_to_deposit_to: Account<'info, TokenAccount>, // Bob's DL token wallet (will be initialized if it did not exist)

    #[account(
        mut,
        associated_token::mint = mint_of_token_user_send,
        associated_token::authority = buyer,
    )]
    pub buyer_usdc_account: Account<'info, TokenAccount>,

    // Users and accounts in the system
    #[account(mut)]
    buyer: Signer<'info>, // Bob

    mint_of_token_user_send: Account<'info, Mint>, // USDC
    mint_of_token_program_sent: Account<'info, Mint>, // DL token

    // Application level accounts
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
}

#[account]
pub struct PreSaleDetails {
    stage: u8,
    owner: Pubkey,
    round_one_price: u64,
    round_two_price: u64,
    round_three_price: u64,
    round_one_allocation_remaining: u64,
    round_two_allocation_remaining: u64,
    round_three_allocation_remaining: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Stage is invalid")]
    StageInvalid,
    #[msg("Unauthorized admin")]
    UnauthorizedAdmin,
    #[msg("Presale has been ended")]
    PresaleEnded,
    #[msg("Presale is not started yet")]
    PresaleNotStartedYet,
    #[msg("Remaining allocation is insufficient")]
    InsufficientAllocation,
}