#![cfg(test)]

use soroban_sdk::{
    contractclient,
    testutils::{Address as _, Ledger},
    vec, Address, Env,
};

use crate::{Payments, PaymentsClient};

#[contractclient(name = "TokenAdminClient")]
pub trait TokenAdmin {
    fn mint(env: Env, to: Address, amount: i128);
}

fn setup<'a>() -> (Env, PaymentsClient<'a>, Address, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract = env.register(Payments, ());
    let client = PaymentsClient::new(&env, &contract);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let r1 = Address::generate(&env);
    let r2 = Address::generate(&env);

    env.ledger().set_timestamp(0);
    (env, client, contract, admin, payer, r1, r2)
}

fn create_token<'a>(
    env: &'a Env,
    admin: &Address,
) -> (Address, soroban_sdk::token::Client<'a>, TokenAdminClient<'a>) {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let addr = sac.address();
    let client = soroban_sdk::token::Client::new(env, &addr);
    let admin_client = TokenAdminClient::new(env, &addr);
    (addr, client, admin_client)
}

#[test]
fn creates_and_releases_payment() {
    let (env, client, contract, admin, payer, r1, r2) = setup();
    let (token, token_client, token_admin) = create_token(&env, &admin);

    token_admin.mint(&payer, &1000);
    assert_eq!(token_client.balance(&payer), 1000);

    let recipients = vec![&env, r1.clone(), r2.clone()];
    let shares = vec![&env, 1u32, 3u32];

    let id = client.create(&payer, &token, &recipients, &shares, &1000);
    assert_eq!(client.get(&id).released, false);

    // Funds pulled into escrow.
    let escrow = contract;
    assert_eq!(token_client.balance(&escrow), 1000);

    client.release(&id);
    let p = client.get(&id);
    assert!(p.released);
    // 1:3 split of 1000 -> 250 / 750.
    assert_eq!(token_client.balance(&r1), 250);
    assert_eq!(token_client.balance(&r2), 750);
}

#[test]
fn refund_returns_funds_to_payer() {
    let (env, client, contract, admin, payer, r1, r2) = setup();
    let (token, token_client, token_admin) = create_token(&env, &admin);

    token_admin.mint(&payer, &500);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];

    let id = client.create(&payer, &token, &recipients, &shares, &500);
    client.refund(&id);

    let p = client.get(&id);
    assert!(p.refunded);
    assert_eq!(token_client.balance(&payer), 500);
    let escrow = contract;
    assert_eq!(token_client.balance(&escrow), 0);
}

#[test]
#[should_panic(expected = "payment already settled")]
fn cannot_release_twice() {
    let (env, client, contract, admin, payer, r1, r2) = setup();
    let (token, _token_client, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &100);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];
    let id = client.create(&payer, &token, &recipients, &shares, &100);
    client.release(&id);
    client.release(&id);
}
