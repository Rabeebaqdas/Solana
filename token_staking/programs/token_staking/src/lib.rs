use anchor_lang::prelude::*;
use anchor_spl :: {
    associated_token::AssociatedToken,
    token:: { Mint, Token, TokenAccount, Transfer, CloseAccount, transfer, close_account}
};
use solana_program::clock::Clock;

declare_id!("7XFbaKsugiPV3q6KLmpDdpydooFBAurqGyVWY3Zy2EZ9");
pub mod constants {
    pub const VAULT_SEED: &[u8] = b"vault";
    pub const STAKE_INFO_SEED: &[u8] = b"stake_info";
    pub const TOKEN_SEED: &[u8] = b"token";
    pub const REWARD_PER_SECOND: u64 = 100000000;
}

#[program]
pub mod token_staking {
  

    use solana_program::native_token::LAMPORTS_PER_SOL;

    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount:u64) -> Result<()> {
        let stake_info = &mut ctx.accounts.stake_info_account;

        if amount <= 0 {
            return Err(ErrorCode::NoTokens.into());
        }

        if stake_info.is_staked {
            
            let clock: Clock = Clock::get()?;
            let time_passed = clock.unix_timestamp as u64 - stake_info.staked_start_time;
         // let rewards = time_passed.checked_mul(10u64.pow(ctx.accounts.mint.decimals as u32)).unwrap();
            let rewards = ((time_passed.checked_mul(constants::REWARD_PER_SECOND).unwrap()).checked_mul(stake_info.staked_amount).unwrap()).checked_div(LAMPORTS_PER_SOL).unwrap();
             stake_info.pending_rewards = stake_info.pending_rewards.checked_add(rewards).unwrap();
        }
        else {
            stake_info.is_staked = true;    
        }

        let clock: Clock = Clock::get()?;

        // using slot
        // stake_info.staked_at_slot = clock.slot; 

        //using unix_timestamp
        stake_info.staked_start_time = clock.unix_timestamp as u64; 
        stake_info.locking_period = (clock.unix_timestamp).checked_add(20).unwrap(); // locking period is of 1 minute
        stake_info.staked_amount = stake_info.staked_amount.checked_add(amount).unwrap();
        //to add the decimals in the input amount
        // let stake_amount = (amount).checked_mul(10u64.pow(ctx.accounts.mint.decimals as u32)).unwrap();

        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from : ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.stake_account.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                }
            ),
            amount
        )?;

        msg!("New Amount: {}", stake_info.staked_amount);
        msg!("Pending Rewards: {}", stake_info.pending_rewards);
        msg!("Staking Start Time: {}", stake_info.staked_start_time);       

        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimRewards>) -> Result<()> {
        let stake_info = &mut ctx.accounts.stake_info_account;
    
        if !stake_info.is_staked {
            return Err(ErrorCode::NotStaked.into());
        }

        let clock = Clock::get()?;
        let time_passed = (clock.unix_timestamp as u64).checked_sub(stake_info.staked_start_time).unwrap();
        let rewards = (((((time_passed.checked_mul(constants::REWARD_PER_SECOND).unwrap()).checked_mul(stake_info.staked_amount)).unwrap())).checked_div(LAMPORTS_PER_SOL).unwrap()).checked_add(stake_info.pending_rewards).unwrap();
        
        let bump_vault = ctx.bumps.token_vault_account;
        let signer: &[&[&[u8]]] = &[&[constants::VAULT_SEED, &[bump_vault]]];

        stake_info.staked_start_time = clock.unix_timestamp as u64;
        stake_info.pending_rewards = 0;

        transfer(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer{
                from:ctx.accounts.token_vault_account.to_account_info() ,
                to: ctx.accounts.user_token_account.to_account_info(),
                authority:ctx.accounts.token_vault_account.to_account_info() ,
            }, signer),
            rewards
        )?;

        msg!("Reward: {}", rewards);
        msg!("Condition: {}", stake_info.locking_period > clock.unix_timestamp);  
        Ok(())
     }
     

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        let stake_info = &mut ctx.accounts.stake_info_account;
        if !stake_info.is_staked {
            return Err(ErrorCode::NotStaked.into());
        }
        let clock = Clock::get()?;
        if stake_info.locking_period > clock.unix_timestamp {
            return Err(ErrorCode::LockingPeriodNotOverYet.into());
        }   

        let time_passed = clock.unix_timestamp as u64 - stake_info.staked_start_time;
        let stake_amount = ctx.accounts.stake_account.amount;

        let rewards = (((((time_passed.checked_mul(constants::REWARD_PER_SECOND).unwrap()).checked_mul(stake_info.staked_amount)).unwrap())).checked_div(LAMPORTS_PER_SOL).unwrap()).checked_add(stake_info.pending_rewards).unwrap();
        let bump_vault = ctx.bumps.token_vault_account;
        let signer_stake_account: &[&[&[u8]]] = &[&[constants::VAULT_SEED, &[bump_vault]]];

        stake_info.is_staked = false;
        stake_info.staked_start_time = 0;
        stake_info.pending_rewards = 0;
        stake_info.locking_period = 0;  
        stake_info.staked_amount = 0;

        transfer(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer{
                from:ctx.accounts.token_vault_account.to_account_info() ,
                to: ctx.accounts.user_token_account.to_account_info(),
                authority:ctx.accounts.token_vault_account.to_account_info() ,
            }, signer_stake_account),
            rewards
        )?;

        let staker = ctx.accounts.signer.key();
        let bump_stake = ctx.bumps.stake_account;
        let signer: &[&[&[u8]]] = &[&[constants::TOKEN_SEED, staker.as_ref(),&[bump_stake]]];
        
        transfer(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer{
                from:ctx.accounts.stake_account.to_account_info() ,
                to: ctx.accounts.user_token_account.to_account_info(),
                authority:ctx.accounts.stake_account.to_account_info() ,
            }, signer),
            stake_amount
        )?;

        let should_close = {
            ctx.accounts.stake_account.reload()?;
            ctx.accounts.stake_account.amount == 0
        };

        if should_close {
            let ca = CloseAccount{
                account: ctx.accounts.stake_account.to_account_info(),
                destination: ctx.accounts.signer.to_account_info(),
                authority: ctx.accounts.stake_account.to_account_info(),
            };

            close_account(CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                ca,
                signer,
            ))?;
        }
    
 
        msg!("Reward: {}", rewards);
        msg!("amount unstaked: {}", stake_amount);  
        Ok(())
    }
}

 
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer : Signer<'info>,
    
    #[account(
        init_if_needed,
        seeds = [constants::VAULT_SEED],
        bump,
        payer = signer, 
        token::mint = mint,
        token::authority = token_vault_account,

    )]
    pub token_vault_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub signer : Signer<'info>,
    
    #[account(
        init_if_needed,
        seeds = [constants::STAKE_INFO_SEED, signer.key.as_ref()],
        bump,
        payer = signer, 
        space = 8 + std::mem::size_of::<StakeInfo>()
    )]
    pub stake_info_account: Account<'info, StakeInfo>,

    #[account(
        init_if_needed,
        seeds = [constants::TOKEN_SEED, signer.key.as_ref()],
        bump,
        payer = signer, 
        token::mint = mint,
        token::authority = stake_account,

    )]
    pub stake_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [constants::VAULT_SEED],
        bump,
    )]
    pub token_vault_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [constants::STAKE_INFO_SEED, signer.key.as_ref()],
        bump,
    )]
    pub stake_info_account: Account<'info, StakeInfo>,

    #[account(
        mut,
        seeds = [constants::TOKEN_SEED, signer.key.as_ref()],
        bump,
    )]
    pub stake_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [constants::VAULT_SEED],
        bump,
    )]
    pub token_vault_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [constants::STAKE_INFO_SEED, signer.key.as_ref()],
        bump,
    )]
    pub stake_info_account: Account<'info, StakeInfo>,

    #[account(
        mut,
        seeds = [constants::TOKEN_SEED, signer.key.as_ref()],
        bump,
    )]
    pub stake_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account] 
pub struct StakeInfo {
    pub staked_start_time: u64,
    pub locking_period: i64,
    pub staked_amount: u64,
    pub is_staked : bool,
    pub pending_rewards: u64,

}

#[error_code]
pub enum  ErrorCode {
    #[msg("Tokens are not staked")]
    NotStaked,
    #[msg("No Tokens to stake")]
    NoTokens,
    #[msg("Locking period is not over yet")]
    LockingPeriodNotOverYet,
}

