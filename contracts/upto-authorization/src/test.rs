#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::{Address as _, BytesN as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

struct Setup {
    env: Env,
    client: UptoAuthorizationClient<'static>,
    token: Address,
    token_client: TokenClient<'static>,
    buyer: Address,
    recipient: Address,
}

fn setup() -> Setup {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(UptoAuthorization, ());
    let client = UptoAuthorizationClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();
    let buyer = Address::generate(&env);
    let recipient = Address::generate(&env);
    StellarAssetClient::new(&env, &token).mint(&buyer, &10_000_000);

    Setup {
        token_client: TokenClient::new(&env, &token),
        env,
        client,
        token,
        buyer,
        recipient,
    }
}

fn expiry(env: &Env) -> u32 {
    env.ledger().sequence() + 1000
}

#[test]
fn authorize_then_settle_actual_below_cap() {
    let s = setup();
    let id = BytesN::<32>::random(&s.env);
    s.client
        .authorize(&s.buyer, &s.recipient, &s.token, &5_000_000, &expiry(&s.env), &id);
    // upto semantics: cap 0.5, actual usage 0.12
    s.client.settle(&id, &1_200_000);
    assert_eq!(s.token_client.balance(&s.recipient), 1_200_000);
    assert_eq!(s.token_client.balance(&s.buyer), 8_800_000);
    assert!(s.client.settled(&id));
    assert!(s.client.authorization(&id).is_none());
}

#[test]
fn second_settle_is_refused_even_below_remaining_cap() {
    let s = setup();
    let id = BytesN::<32>::random(&s.env);
    s.client
        .authorize(&s.buyer, &s.recipient, &s.token, &5_000_000, &expiry(&s.env), &id);
    s.client.settle(&id, &1_000_000);
    let err = s.client.try_settle(&id, &1_000_000).err().unwrap().unwrap();
    assert_eq!(err, Error::AlreadySettled);
    assert_eq!(s.token_client.balance(&s.recipient), 1_000_000);
}

#[test]
fn settle_above_cap_is_refused_and_burns_nothing() {
    let s = setup();
    let id = BytesN::<32>::random(&s.env);
    s.client
        .authorize(&s.buyer, &s.recipient, &s.token, &5_000_000, &expiry(&s.env), &id);
    let err = s.client.try_settle(&id, &5_000_001).err().unwrap().unwrap();
    assert_eq!(err, Error::CapExceeded);
    // F4: the failed settle consumed nothing — the authorization is intact.
    assert!(!s.client.settled(&id));
    s.client.settle(&id, &5_000_000);
    assert_eq!(s.token_client.balance(&s.recipient), 5_000_000);
}

#[test]
fn expired_authorization_cannot_settle() {
    let s = setup();
    let id = BytesN::<32>::random(&s.env);
    let exp = expiry(&s.env);
    s.client
        .authorize(&s.buyer, &s.recipient, &s.token, &5_000_000, &exp, &id);
    s.env.ledger().with_mut(|l| l.sequence_number = exp + 1);
    let err = s.client.try_settle(&id, &1).err().unwrap().unwrap();
    assert_eq!(err, Error::Expired);
}

#[test]
fn unknown_auth_id_is_not_found() {
    let s = setup();
    let id = BytesN::<32>::random(&s.env);
    let err = s.client.try_settle(&id, &1).err().unwrap().unwrap();
    assert_eq!(err, Error::NotFound);
}

#[test]
fn auth_id_reuse_is_refused_live_and_after_settlement() {
    let s = setup();
    let id = BytesN::<32>::random(&s.env);
    s.client
        .authorize(&s.buyer, &s.recipient, &s.token, &1_000_000, &expiry(&s.env), &id);
    let err = s
        .client
        .try_authorize(&s.buyer, &s.recipient, &s.token, &1_000_000, &expiry(&s.env), &id)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::AuthExists);
    s.client.settle(&id, &1_000_000);
    // F8/F11: a settled tag can never be re-authorized into a fresh spend.
    let err = s
        .client
        .try_authorize(&s.buyer, &s.recipient, &s.token, &1_000_000, &expiry(&s.env), &id)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::AuthExists);
}

#[test]
fn zero_and_negative_amounts_are_refused() {
    let s = setup();
    let id = BytesN::<32>::random(&s.env);
    let err = s
        .client
        .try_authorize(&s.buyer, &s.recipient, &s.token, &0, &expiry(&s.env), &id)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::BadAmount);
    s.client
        .authorize(&s.buyer, &s.recipient, &s.token, &1_000, &expiry(&s.env), &id);
    let err = s.client.try_settle(&id, &0).err().unwrap().unwrap();
    assert_eq!(err, Error::BadAmount);
    let err = s.client.try_settle(&id, &-5).err().unwrap().unwrap();
    assert_eq!(err, Error::BadAmount);
}

#[test]
fn stale_expiry_is_refused_at_authorize() {
    let s = setup();
    let id = BytesN::<32>::random(&s.env);
    let now = s.env.ledger().sequence();
    let err = s
        .client
        .try_authorize(&s.buyer, &s.recipient, &s.token, &1_000, &now, &id)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::BadExpiry);
}

#[test]
fn settlement_pays_the_pinned_recipient_not_the_caller() {
    let s = setup();
    let id = BytesN::<32>::random(&s.env);
    s.client
        .authorize(&s.buyer, &s.recipient, &s.token, &2_000_000, &expiry(&s.env), &id);
    // settle is permissionless; whoever calls it, funds go to the recipient
    // the BUYER signed for (F11: recipient binding).
    s.client.settle(&id, &2_000_000);
    assert_eq!(s.token_client.balance(&s.recipient), 2_000_000);
}
