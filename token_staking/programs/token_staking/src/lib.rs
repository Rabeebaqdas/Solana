use anchor_lang::prelude::*;
use anchor_spl :: {
    associated_token::AssociatedToken,
    token:: { Mint, Token, TokenAccount, Transfer, CloseAccount, transfer, close_account}
};
use solana_program::clock::Clock;

declare_id!("7XFbaKsugiPV3q6KLmpDdpydooFBAurqGyVWY3Zy2EZ9");
pub mod constants {
    pub const SECONDS_IN_A_YEAR: u64 = 31_536_000;  // TODO: for prod
    // pub const SECONDS_IN_A_YEAR: u64 = 12;       // TODO: for dev
    pub const BASE: u64 = 100;
    pub const VAULT_SEED: &[u8] = b"vault";
    pub const STAKE_INFO_SEED: &[u8] = b"stake_info";
    pub const TOKEN_SEED: &[u8] = b"token";

    // Locking periods in seconds
    pub const LOCKING_PERIOD_1_YEAR: u64 = SECONDS_IN_A_YEAR;
    pub const LOCKING_PERIOD_2_YEARS: u64 = SECONDS_IN_A_YEAR * 2;
    pub const LOCKING_PERIOD_3_YEARS: u64 = SECONDS_IN_A_YEAR * 3;
    pub const LOCKING_PERIOD_4_YEARS: u64 = SECONDS_IN_A_YEAR * 4;


    // APR percentages as decimals (multiplied by 100 for easier math)
    pub const APR_1_YEAR: u64 = 15;
    pub const APR_2_YEARS: u64 = 30;
    pub const APR_3_YEARS: u64 = 60;
    pub const APR_4_YEARS: u64 = 120;

}

#[program]
pub mod token_staking {

    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount:u64, locking_period_choice: u8) -> Result<()> {
        let stake_info = &mut ctx.accounts.stake_info_account;

        if amount == 0 {
            return Err(ErrorCode::NoTokens.into());
        }
        let clock: Clock = Clock::get()?;
        let current_time = clock.unix_timestamp as u64;

        if stake_info.is_staked {
            let time_passed = current_time - stake_info.last_claim_reward_time;
            let earned_rewards = (time_passed.checked_mul(stake_info.apr).unwrap())
            .checked_mul(stake_info.staked_amount)
            .unwrap()
            .checked_div(constants::BASE)
            .unwrap()
            .checked_div(constants::SECONDS_IN_A_YEAR)
            .unwrap();
             stake_info.pending_rewards = stake_info.pending_rewards.checked_add(earned_rewards).unwrap();
        }
        else {
            stake_info.is_staked = true;    
        }

            // Set APR and locking period based on user's choice
            match locking_period_choice {
                1 => {
                    stake_info.apr = constants::APR_1_YEAR;
                    stake_info.locking_period = current_time + constants::LOCKING_PERIOD_1_YEAR;
                }
                2 => {
                    stake_info.apr = constants::APR_2_YEARS;
                    stake_info.locking_period = current_time + constants::LOCKING_PERIOD_2_YEARS;
                }
                3 => {
                    stake_info.apr = constants::APR_3_YEARS;
                    stake_info.locking_period = current_time + constants::LOCKING_PERIOD_3_YEARS;
                }
                4 => {
                    stake_info.apr = constants::APR_4_YEARS;
                    stake_info.locking_period = current_time + constants::LOCKING_PERIOD_4_YEARS;
                }
                _ => return Err(ErrorCode::InvalidLockingPeriod.into()),
            }

        //using unix_timestamp
        stake_info.staked_start_time = current_time; 
        stake_info.last_claim_reward_time = current_time; 
        stake_info.staked_amount = stake_info.staked_amount.checked_add(amount).unwrap();

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
        msg!("Selected APR: {}", stake_info.apr);
        msg!("Locking Period: {}", stake_info.locking_period);
       
        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimRewards>) -> Result<()> {
        let stake_info = &mut ctx.accounts.stake_info_account;
    
        if !stake_info.is_staked {
            return Err(ErrorCode::NotStaked.into());
        }

        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp as u64;
        let time_passed = current_time.checked_sub(stake_info.last_claim_reward_time).unwrap();
        let earned_rewards = (time_passed.checked_mul(stake_info.apr).unwrap())
        .checked_mul(stake_info.staked_amount)
        .unwrap()
        .checked_div(constants::BASE)
        .unwrap()
        .checked_div(constants::SECONDS_IN_A_YEAR) // Divide by seconds in a year
        .unwrap();

        // Add any previously pending rewards
        let total_rewards = earned_rewards.checked_add(stake_info.pending_rewards).unwrap();

        // Prepare for next staking period
        stake_info.last_claim_reward_time = current_time;
        stake_info.pending_rewards = 0; // Reset pending rewards after claiming

        let bump_vault = ctx.bumps.token_vault_account;
        let signer: &[&[&[u8]]] = &[&[constants::VAULT_SEED, &[bump_vault]]];

        transfer(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer{
                from:ctx.accounts.token_vault_account.to_account_info() ,
                to: ctx.accounts.user_token_account.to_account_info(),
                authority:ctx.accounts.token_vault_account.to_account_info() ,
            }, signer),
            total_rewards
        )?;

        msg!("Claimed Rewards: {}", total_rewards);
        msg!("Condition: {}", stake_info.locking_period > current_time);  
        Ok(())
     }
     

    pub fn unstake(ctx: Context<Unstake>, amount_to_unstake: u64) -> Result<()> {
        let stake_info = &mut ctx.accounts.stake_info_account;
        if !stake_info.is_staked {
            return Err(ErrorCode::NotStaked.into());
        }
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp as u64;
        if stake_info.locking_period > current_time {
            return Err(ErrorCode::LockingPeriodNotOverYet.into());
        }   

        // Validate the unstake amount
        if amount_to_unstake == 0 || amount_to_unstake > stake_info.staked_amount {
        return Err(ErrorCode::InvalidUnstakeAmount.into());
        }

        let time_passed = current_time - stake_info.last_claim_reward_time;
        let stake_amount = ctx.accounts.stake_account.amount;
        let earned_rewards = (time_passed.checked_mul(stake_info.apr).unwrap())
        .checked_mul(stake_info.staked_amount)
        .unwrap()
        .checked_div(constants::BASE) // Convert APR to fractional
        .unwrap()
        .checked_div(constants::SECONDS_IN_A_YEAR)
        .unwrap();
        let total_rewards = earned_rewards.checked_add(stake_info.pending_rewards).unwrap();

        // Update stake info
        stake_info.staked_amount = stake_info.staked_amount.checked_sub(amount_to_unstake).unwrap();

        // If all tokens are unstaked, reset stake info
        if stake_info.staked_amount == 0 {
        stake_info.is_staked = false;
        stake_info.last_claim_reward_time = 0;
        stake_info.pending_rewards = 0;
        stake_info.locking_period = 0;  
        stake_info.staked_amount = 0;
        }
        
        let bump_vault = ctx.bumps.token_vault_account;
        let signer_vault: &[&[&[u8]]] = &[&[constants::VAULT_SEED, &[bump_vault]]];
        
        transfer(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer{
                from:ctx.accounts.token_vault_account.to_account_info() ,
                to: ctx.accounts.user_token_account.to_account_info(),
                authority:ctx.accounts.token_vault_account.to_account_info() ,
            }, signer_vault),
            total_rewards
        )?;

        let staker = ctx.accounts.signer.key();
        let bump_stake = ctx.bumps.stake_account;
        let signer_stake_account: &[&[&[u8]]] = &[&[constants::TOKEN_SEED, staker.as_ref(),&[bump_stake]]];
        
        transfer(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer{
                from:ctx.accounts.stake_account.to_account_info() ,
                to: ctx.accounts.user_token_account.to_account_info(),
                authority:ctx.accounts.stake_account.to_account_info() ,
            }, signer_stake_account),
            amount_to_unstake
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
                signer_stake_account,
            ))?;
        }
 
        msg!("Reward: {}", total_rewards);
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
    pub last_claim_reward_time: u64,
    pub locking_period: u64,
    pub staked_amount: u64,
    pub is_staked : bool,
    pub pending_rewards: u64,
    pub apr: u64,
}

#[error_code]
pub enum  ErrorCode {
    #[msg("Tokens are not staked")]
    NotStaked,
    #[msg("No Tokens to stake")]
    NoTokens,
    #[msg("Locking period is not over yet")]
    LockingPeriodNotOverYet,
    #[msg("Invalid locking period choice")]
    InvalidLockingPeriod,
    #[msg("Invalid unstake amount")]
    InvalidUnstakeAmount,
}

