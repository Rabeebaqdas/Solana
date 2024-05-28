use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{
        burn, close_account, transfer, Burn, CloseAccount, Mint, Token, TokenAccount, Transfer,
    },
};
declare_id!("HCXo1ZoY2ALW9dWDBjU1NfwHoaEEDsZ9g1FwrNfRC7GC");

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

#[program]
pub mod presale {
    use super::*;

    pub fn initialize(
        ctx: Context<InitializePresale>,
        round_one_allocation: u64,
        round_two_allocation: u64,
        round_three_allocation: u64,
    ) -> Result<()> {
        let info = &mut ctx.accounts.presale_info;
        info.round_one_allocation_remaining = round_one_allocation;
        info.round_two_allocation_remaining = round_two_allocation;
        info.round_three_allocation_remaining = round_three_allocation;
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
            msg!(
                "Stage is invalid, state stage is {}",
                ctx.accounts.presale_info.stage
            );
            return Err(ErrorCode::StageInvalid.into());
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
                let should_close = {
                    ctx.accounts.token_vault.reload()?;
                    ctx.accounts.token_vault.amount == 0
                };

                if should_close {
                    let ca = CloseAccount {
                        account: ctx.accounts.token_vault.to_account_info(),
                        destination: ctx.accounts.admin.to_account_info(),
                        authority: info.to_account_info(),
                    };

                    let cpi_ctx = CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        ca,
                        signer,
                    );

                    close_account(cpi_ctx)?;
                }
            }
        }

        info.stage = info.stage.checked_add(1).unwrap();

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
    // fn to_code(&self) -> u8 {
    //     match self {
    //         Stage::PresaleNotStartedYet => 0,
    //         Stage::RoundOne => 1,
    //         Stage::RoundTwo => 2,
    //         Stage::RoundThird => 3,
    //         Stage::PresaleEnded => 4,
    //     }
    // }

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

#[account]
pub struct PreSaleDetails {
    stage: u8,
    owner: Pubkey,
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
}
