#![no_std]

use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype,
    Address, Env, Symbol, Vec,
};

/// A payment intent held in escrow until released or refunded.
#[contracttype]
pub struct Payment {
    pub payer: Address,
    pub recipients: Vec<Address>,
    pub shares: Vec<u32>,
    pub amount: i128,
    pub token: Address,
    pub released: bool,
    pub refunded: bool,
}

#[contracttype]
pub enum DataKey {
    Payment(u64),
    Counter,
}

#[contractclient(name = "TokenClient")]
pub trait Token {
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn balance(env: Env, id: Address) -> i128;
}

#[contract]
pub struct Payments;

#[contractimpl]
impl Payments {
    /// Create an escrow payment splitting `amount` of `token` across
    /// `recipients` proportionally to `shares`. Requires payer auth and
    /// pulls the funds into the contract immediately.
    pub fn create(
        env: Env,
        payer: Address,
        token: Address,
        recipients: Vec<Address>,
        shares: Vec<u32>,
        amount: i128,
    ) -> u64 {
        payer.require_auth();

        if recipients.is_empty() {
            panic!("no recipients");
        }
        if recipients.len() != shares.len() {
            panic!("recipients/shares mismatch");
        }
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let total_shares: u32 = shares.iter().sum();
        if total_shares == 0 {
            panic!("shares sum to zero");
        }

        let mut counter: u64 = env.storage().instance().get(&DataKey::Counter).unwrap_or(0);
        counter += 1;

        let payment = Payment {
            payer: payer.clone(),
            recipients,
            shares,
            amount,
            token: token.clone(),
            released: false,
            refunded: false,
        };
        env.storage()
            .instance()
            .set(&DataKey::Payment(counter), &payment);
        env.storage().instance().set(&DataKey::Counter, &counter);

        TokenClient::new(&env, &token).transfer(&payer, &env.current_contract_address(), &amount);

        counter
    }

    /// Release escrowed funds to recipients according to their shares.
    /// Only the payer can release.
    pub fn release(env: Env, payment_id: u64) -> Symbol {
        let mut payment: Payment = env
            .storage()
            .instance()
            .get(&DataKey::Payment(payment_id))
            .unwrap_or_else(|| panic!("unknown payment"));
        payment.payer.require_auth();

        if payment.released || payment.refunded {
            panic!("payment already settled");
        }

        let total_shares: u32 = payment.shares.iter().sum();
        let token = TokenClient::new(&env, &payment.token);

        let mut distributed: i128 = 0;
        for i in 0..payment.recipients.len() {
            let share = payment.shares.get(i).unwrap() as i128;
            let mut value = (payment.amount * share) / (total_shares as i128);
            if i == payment.recipients.len() - 1 {
                // Last recipient absorbs rounding remainder.
                value = payment.amount - distributed;
            }
            distributed += value;
            token.transfer(
                &env.current_contract_address(),
                &payment.recipients.get(i).unwrap(),
                &value,
            );
        }

        payment.released = true;
        env.storage()
            .instance()
            .set(&DataKey::Payment(payment_id), &payment);

        Symbol::new(&env, "released")
    }

    /// Refund the full amount back to the payer. Only the payer can refund.
    pub fn refund(env: Env, payment_id: u64) -> Symbol {
        let mut payment: Payment = env
            .storage()
            .instance()
            .get(&DataKey::Payment(payment_id))
            .unwrap_or_else(|| panic!("unknown payment"));
        payment.payer.require_auth();

        if payment.released || payment.refunded {
            panic!("payment already settled");
        }

        TokenClient::new(&env, &payment.token).transfer(
            &env.current_contract_address(),
            &payment.payer,
            &payment.amount,
        );

        payment.refunded = true;
        env.storage()
            .instance()
            .set(&DataKey::Payment(payment_id), &payment);

        Symbol::new(&env, "refunded")
    }

    /// Read a payment's current state.
    pub fn get(env: Env, payment_id: u64) -> Payment {
        env.storage()
            .instance()
            .get(&DataKey::Payment(payment_id))
            .unwrap_or_else(|| panic!("unknown payment"))
    }
}

#[cfg(test)]
mod test;
