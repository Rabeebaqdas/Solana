use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
declare_id!("AsJfSnJ1TVRw5CNcC7StpBWNdiz7krfMxFyMaQGWjKnz");

#[program]
pub mod gifportal {

    use super::*;
    pub fn start_stuff_off(ctx: Context<StartStuffOff>) -> ProgramResult {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct StartStuffOff{}
