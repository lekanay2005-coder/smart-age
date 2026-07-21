#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, Address, Env, Symbol, Vec,
};

/// Errors returned by the Payments contract. Using a typed enum (instead of
/// raw `panic!` strings) lets clients match on `error code` reliably.
#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// `recipients` was empty.
    NoRecipients = 1,
    /// `recipients.len()` != `shares.len()`.
    RecipientsSharesMismatch = 2,
    /// `amount` was zero or negative.
    NonPositiveAmount = 3,
    /// Sum of `shares` was zero (e.g. all shares were 0).
    ZeroTotalShares = 4,
    /// One or more individual shares were zero.
    ZeroShare = 5,
    /// Duplicate recipient addresses were supplied.
    DuplicateRecipient = 6,
    /// Too many recipients for a single payment.
    TooManyRecipients = 7,
    /// The referenced payment does not exist.
    UnknownPayment = 8,
    /// The payment was already released or refunded.
    AlreadySettled = 9,
}

impl Error {
    /// Human-readable message for panics / client mapping.
    pub fn message(&self) -> &'static str {
        match self {
            Error::NoRecipients => "no recipients",
            Error::RecipientsSharesMismatch => "recipients/shares mismatch",
            Error::NonPositiveAmount => "amount must be positive",
            Error::ZeroTotalShares => "shares sum to zero",
            Error::ZeroShare => "share must be greater than zero",
            Error::DuplicateRecipient => "duplicate recipient",
            Error::TooManyRecipients => "too many recipients",
            Error::UnknownPayment => "unknown payment",
            Error::AlreadySettled => "payment already settled",
        }
    }
}

impl core::fmt::Display for Error {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.write_str(self.message())
    }
}

/// Maximum number of recipients per payment (bounds gas/calldata).
const MAX_RECIPIENTS: u32 = 50;

/// Default deadline (seconds) after which an unreleased payment can be
/// auto-refunded by anyone. 0 means "no deadline" for this deployment.
const DEFAULT_DEADLINE_SECS: u64 = 0;

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
    /// Ledger timestamp when the payment was created.
    pub created_at: u64,
    /// Ledger timestamp of the last settle (release/refund), 0 if unset.
    pub updated_at: u64,
    /// Ledger timestamp after which an unreleased payment may be refunded.
    /// 0 means "no deadline" (only the payer can refund).
    pub deadline: u64,
}

/// Aggregate statistics returned by `stats()`.
#[contracttype]
pub struct Stats {
    pub count: u64,
    pub volume: i128,
}

#[contracttype]
pub enum DataKey {
    Payment(u64),
    Counter,
    PayerPayments(Address),
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
    ///
    /// Guards: non-empty recipients, equal lengths, positive amount, all
    /// shares > 0, no duplicate recipients, and at most `MAX_RECIPIENTS`.
    ///
    /// `deadline` is an optional ledger timestamp (seconds). If 0, the payment
    /// never auto-expires and only the payer may refund. If set, anyone may
    /// refund after that time via `refund` (#60).
    pub fn create(
        env: Env,
        payer: Address,
        token: Address,
        recipients: Vec<Address>,
        shares: Vec<u32>,
        amount: i128,
        deadline: u64,
    ) -> u64 {
        payer.require_auth();

        validate_inputs(&env, &recipients, &shares, amount);
        let deadline = if deadline == 0 {
            DEFAULT_DEADLINE_SECS
        } else {
            deadline
        };

        let mut counter: u64 = env.storage().instance().get(&DataKey::Counter).unwrap_or(0);
        counter += 1;

        let now = env.ledger().timestamp();
        let payment = Payment {
            payer: payer.clone(),
            recipients,
            shares,
            amount,
            token: token.clone(),
            released: false,
            refunded: false,
            created_at: now,
            updated_at: 0,
            deadline,
        };
        env.storage()
            .instance()
            .set(&DataKey::Payment(counter), &payment);
        env.storage().instance().set(&DataKey::Counter, &counter);

        let key = DataKey::PayerPayments(payer.clone());
        let mut ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env));
        ids.push_back(counter);
        env.storage().persistent().set(&key, &ids);

        TokenClient::new(&env, &token).transfer(&payer, &env.current_contract_address(), &amount);

        #[allow(deprecated)]
        env.events().publish(
            (Symbol::new(&env, "payment_created"), counter),
            (payer.clone(), token, amount),
        );

        counter
    }

    /// Release escrowed funds to recipients according to their shares.
    /// Only the payer can release. The last recipient absorbs any rounding
    /// remainder so the full amount is always distributed.
    pub fn release(env: Env, payment_id: u64) -> Symbol {
        let mut payment: Payment = load_payment(&env, payment_id);
        payment.payer.require_auth();

        if payment.released || payment.refunded {
            panic!("{}", Error::AlreadySettled);
        }

        let total_shares: u32 = payment.shares.iter().sum();
        let token = TokenClient::new(&env, &payment.token);

        let mut distributed: i128 = 0;
        let n = payment.recipients.len();
        for i in 0..n {
            let share = payment.shares.get(i).unwrap() as i128;
            let mut value = (payment.amount * share) / (total_shares as i128);
            if i == n - 1 {
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
        // Safety: rounding must never lose value.
        assert_eq!(distributed, payment.amount, "distribution underflow");

        payment.released = true;
        payment.updated_at = env.ledger().timestamp();
        env.storage()
            .instance()
            .set(&DataKey::Payment(payment_id), &payment);

        #[allow(deprecated)]
        env.events().publish(
            (Symbol::new(&env, "released"), payment_id),
            payment.released,
        );

        Symbol::new(&env, "released")
    }

    /// Refund the full amount back to the payer.
    ///
    /// Before the optional `deadline`, only the payer may refund. After the
    /// deadline has passed (and the payment is still escrowed), *anyone* may
    /// trigger the refund — this is the auto-refund safety net (#60).
    pub fn refund(env: Env, payment_id: u64) -> Symbol {
        let mut payment: Payment = load_payment(&env, payment_id);

        let past_deadline = payment.deadline != 0 && env.ledger().timestamp() >= payment.deadline;
        if !past_deadline {
            payment.payer.require_auth();
        }

        if payment.released || payment.refunded {
            panic!("{}", Error::AlreadySettled);
        }

        TokenClient::new(&env, &payment.token).transfer(
            &env.current_contract_address(),
            &payment.payer,
            &payment.amount,
        );

        payment.refunded = true;
        payment.updated_at = env.ledger().timestamp();
        env.storage()
            .instance()
            .set(&DataKey::Payment(payment_id), &payment);

        #[allow(deprecated)]
        env.events().publish(
            (Symbol::new(&env, "refunded"), payment_id),
            payment.refunded,
        );

        Symbol::new(&env, "refunded")
    }

    /// Cancel an escrowed (unreleased, unrefunded) payment and refund the payer.
    /// `cancel` is identical to `refund` but is restricted to the payer even
    /// after a deadline, giving the payer an explicit "void this payment" action
    /// distinct from the time-based auto-refund (#58).
    pub fn cancel(env: Env, payment_id: u64) -> Symbol {
        let mut payment: Payment = load_payment(&env, payment_id);
        payment.payer.require_auth();

        if payment.released || payment.refunded {
            panic!("{}", Error::AlreadySettled);
        }

        TokenClient::new(&env, &payment.token).transfer(
            &env.current_contract_address(),
            &payment.payer,
            &payment.amount,
        );

        payment.refunded = true;
        payment.updated_at = env.ledger().timestamp();
        env.storage()
            .instance()
            .set(&DataKey::Payment(payment_id), &payment);

        #[allow(deprecated)]
        env.events().publish(
            (Symbol::new(&env, "cancelled"), payment_id),
            payment.refunded,
        );

        Symbol::new(&env, "cancelled")
    }

    /// Read a payment's current state.
    pub fn get(env: Env, payment_id: u64) -> Payment {
        load_payment(&env, payment_id)
    }

    /// List all payment ids created by `payer`.
    pub fn list(env: Env, payer: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::PayerPayments(payer))
            .unwrap_or(Vec::new(&env))
    }

    /// Total number of payments ever created (the current counter value).
    pub fn payment_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::Counter).unwrap_or(0)
    }

    /// Aggregate stats across all payments: total count and total volume
    /// escrowed (sum of `amount` over every payment, settled or not).
    pub fn stats(env: Env) -> Stats {
        let count: u64 = env.storage().instance().get(&DataKey::Counter).unwrap_or(0);
        let mut volume: i128 = 0;
        for id in 1..=count {
            if let Some(p) = env
                .storage()
                .instance()
                .get::<_, Payment>(&DataKey::Payment(id))
            {
                volume += p.amount;
            }
        }
        Stats { count, volume }
    }
}

// --- helpers ---------------------------------------------------------------

fn validate_inputs(env: &Env, recipients: &Vec<Address>, shares: &Vec<u32>, amount: i128) {
    if recipients.is_empty() {
        panic!("{}", Error::NoRecipients);
    }
    if recipients.len() != shares.len() {
        panic!("{}", Error::RecipientsSharesMismatch);
    }
    if recipients.len() > MAX_RECIPIENTS {
        panic!("{}", Error::TooManyRecipients);
    }
    if amount <= 0 {
        panic!("{}", Error::NonPositiveAmount);
    }

    let mut total_shares: u32 = 0;
    for i in 0..recipients.len() {
        let s = shares.get(i).unwrap();
        if s == 0 {
            panic!("{}", Error::ZeroShare);
        }
        total_shares += s;

        // Duplicate detection (O(n^2) but n <= MAX_RECIPIENTS).
        let current = recipients.get(i).unwrap();
        for j in (i + 1)..recipients.len() {
            if recipients.get(j).unwrap() == current {
                panic!("{}", Error::DuplicateRecipient);
            }
        }
    }
    if total_shares == 0 {
        panic!("{}", Error::ZeroTotalShares);
    }
    let _ = env;
}

fn load_payment(env: &Env, payment_id: u64) -> Payment {
    env.storage()
        .instance()
        .get(&DataKey::Payment(payment_id))
        .unwrap_or_else(|| panic!("{}", Error::UnknownPayment))
}

#[cfg(test)]
mod test;
