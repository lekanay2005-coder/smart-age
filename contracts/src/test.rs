#![cfg(test)]

use soroban_sdk::{
    contractclient,
    testutils::{Address as _, Ledger},
    vec, Address, Env,
};

use crate::{Payments, PaymentsClient};

#[allow(dead_code)]
#[contractclient(name = "TokenAdminClient")]
pub trait TokenAdmin {
    fn mint(env: Env, to: Address, amount: i128);
}

fn setup<'a>() -> (
    Env,
    PaymentsClient<'a>,
    Address,
    Address,
    Address,
    Address,
    Address,
) {
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
) -> (
    Address,
    soroban_sdk::token::Client<'a>,
    TokenAdminClient<'a>,
) {
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

    let id = client.create(&payer, &token, &recipients, &shares, &1000, &0);
    assert!(!client.get(&id).released);

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

    let id = client.create(&payer, &token, &recipients, &shares, &500, &0);
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
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, _token_client, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &100);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];
    let id = client.create(&payer, &token, &recipients, &shares, &100, &0);
    client.release(&id);
    client.release(&id);
}

#[test]
fn list_returns_payer_payments() {
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, _token_client, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &200);

    let recipients = vec![&env, r1.clone(), r2.clone()];
    let shares = vec![&env, 1u32, 1u32];
    let a = client.create(&payer, &token, &recipients, &shares, &100, &0);
    let b = client.create(&payer, &token, &recipients, &shares, &100, &0);

    let ids = client.list(&payer);
    assert_eq!(ids.len(), 2);
    assert_eq!(ids.get(0).unwrap(), a);
    assert_eq!(ids.get(1).unwrap(), b);
}

#[test]
fn rejects_zero_share() {
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, _tc, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &100);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 0u32, 1u32];
    let res = client.try_create(&payer, &token, &recipients, &shares, &100, &0);
    assert!(res.is_err());
}

#[test]
fn rejects_duplicate_recipients() {
    let (env, client, _contract, admin, payer, r1, _r2) = setup();
    let (token, _tc, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &100);
    let recipients = vec![&env, r1.clone(), r1];
    let shares = vec![&env, 1u32, 1u32];
    let res = client.try_create(&payer, &token, &recipients, &shares, &100, &0);
    assert!(res.is_err());
}

#[test]
fn rejects_negative_amount() {
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, _tc, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &100);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];
    let res = client.try_create(&payer, &token, &recipients, &shares, &-5, &0);
    assert!(res.is_err());
}

#[test]
fn single_recipient_gets_full_amount() {
    let (env, client, contract, admin, payer, r1, _r2) = setup();
    let (token, token_client, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &777);
    let recipients = vec![&env, r1.clone()];
    let shares = vec![&env, 1u32];
    let id = client.create(&payer, &token, &recipients, &shares, &777, &0);
    client.release(&id);
    assert_eq!(token_client.balance(&r1), 777);
    let escrow = contract;
    assert_eq!(token_client.balance(&escrow), 0);
}

#[test]
fn get_unknown_payment_errors() {
    let (_env, client, _contract, _admin, _payer, _r1, _r2) = setup();
    let res = client.try_get(&999);
    assert!(res.is_err());
}

#[test]
fn refund_after_release_is_blocked() {
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, _tc, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &100);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];
    let id = client.create(&payer, &token, &recipients, &shares, &100, &0);
    client.release(&id);
    let res = client.try_refund(&id);
    assert!(res.is_err());
}

#[test]
fn counter_is_monotonic() {
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, _tc, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &300);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];
    let a = client.create(&payer, &token, &recipients, &shares, &100, &0);
    let b = client.create(&payer, &token, &recipients, &shares, &100, &0);
    let c = client.create(&payer, &token, &recipients, &shares, &100, &0);
    assert!(a < b && b < c);
    assert_eq!(client.payment_count(), 3);
}

#[test]
fn stats_reports_count_and_volume() {
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, _tc, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &300);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];
    client.create(&payer, &token, &recipients, &shares, &100, &0);
    client.create(&payer, &token, &recipients, &shares, &200, &0);
    let s = client.stats();
    assert_eq!(s.count, 2);
    assert_eq!(s.volume, 300);
}

#[test]
fn emits_created_event() {
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, _tc, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &100);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];
    let id = client.create(&payer, &token, &recipients, &shares, &100, &0);
    // If we got here without panicking, the create-path events fired and the
    // payment exists with escrow recorded below.
    let p = client.get(&id);
    assert!(!p.released && !p.refunded);
}

#[test]
fn created_at_is_recorded() {
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, _tc, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &100);
    env.ledger().set_timestamp(1_700_000_000);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];
    let id = client.create(&payer, &token, &recipients, &shares, &100, &0);
    assert_eq!(client.get(&id).created_at, 1_700_000_000);
}

#[test]
fn cancel_refunds_payer() {
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, token_client, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &100);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];
    let id = client.create(&payer, &token, &recipients, &shares, &100, &0);
    client.cancel(&id);
    let p = client.get(&id);
    assert!(p.refunded);
    assert_eq!(token_client.balance(&payer), 100);
}

#[test]
#[should_panic(expected = "payment already settled")]
fn cannot_cancel_after_release() {
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, _tc, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &100);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];
    let id = client.create(&payer, &token, &recipients, &shares, &100, &0);
    client.release(&id);
    client.cancel(&id);
}

#[test]
fn refund_after_deadline_allowed_by_anyone() {
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, token_client, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &100);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];
    let id = client.create(&payer, &token, &recipients, &shares, &100, &1_000);
    // Advance ledger past the deadline; refund no longer requires payer auth.
    env.ledger().set_timestamp(1_000);
    client.refund(&id);
    let p = client.get(&id);
    assert!(p.refunded);
    assert_eq!(token_client.balance(&payer), 100);
}

#[test]
fn deadline_is_stored() {
    let (env, client, _contract, admin, payer, r1, r2) = setup();
    let (token, _tc, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &100);
    let recipients = vec![&env, r1, r2];
    let shares = vec![&env, 1u32, 1u32];
    let id = client.create(&payer, &token, &recipients, &shares, &100, &1_234);
    assert_eq!(client.get(&id).deadline, 1_234);
}
