use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{close_account, transfer, CloseAccount, Mint, Token, TokenAccount, Transfer},
};
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

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
        info.round_one_allocation = round_one_allocation;
        info.round_two_allocation = round_two_allocation;
        info.round_three_allocation = round_three_allocation;

        let total_amount_to_be_deposit = (round_one_allocation
            .checked_add(round_two_allocation)
            .unwrap())
        .checked_add(round_three_allocation)
        .unwrap();

        //sending pre sale tokens into valut upon initialization
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.admin.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.admin.to_account_info(),
                },
            ),
            total_amount_to_be_deposit,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePresale<'info> {
    // Derived PDAs
    #[account(
        init_if_needed,
        payer = admin,
        seeds=[b"presale".as_ref()],
        bump,
        space = 8 + std::mem::size_of::<PreSaleDetails>()
    )]
    presale_info: Account<'info, PreSaleDetails>,

    #[account(
        init_if_needed,
        payer = admin,
        seeds=[b"usdc_vault".as_ref()],
        bump,
        token::mint = mint_of_token_user_send,
        token::authority = presale_info,
    )]
    usdc_vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = admin,
        seeds=[b"token_vault".as_ref()],
        bump,
        token::mint = mint_of_token_program_sent,
        token::authority = presale_info,
    )]
    token_vault: Account<'info, TokenAccount>,

    mint_of_token_user_send: Account<'info, Mint>, // USDC
    mint_of_token_program_sent: Account<'info, Mint>, // Token

    #[account(mut)]
    admin: Signer<'info>, // The person who is initializing the presale

    // Application level accounts
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
}

#[account]
pub struct PreSaleDetails {
    round_id: u8,
    round_one_allocation: u64,
    round_two_allocation: u64,
    round_three_allocation: u64,
}
