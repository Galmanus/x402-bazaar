#![cfg(test)]
use super::*;
use ed25519_dalek::{Signer, SigningKey};
use soroban_sdk::{testutils::BytesN as _, vec, Env, IntoVal};

fn signing_key() -> SigningKey {
    SigningKey::from_bytes(&[7u8; 32])
}

fn owner_bytes(env: &Env, key: &SigningKey) -> BytesN<32> {
    BytesN::from_array(env, &key.verifying_key().to_bytes())
}

#[test]
fn stores_owner() {
    let env = Env::default();
    let key = signing_key();
    let owner = owner_bytes(&env, &key);
    let id = env.register(Ed25519Account, (owner.clone(),));
    assert_eq!(Ed25519AccountClient::new(&env, &id).owner(), owner);
}

#[test]
fn accepts_owner_signature() {
    let env = Env::default();
    let key = signing_key();
    let owner = owner_bytes(&env, &key);
    let id = env.register(Ed25519Account, (owner.clone(),));

    let payload = BytesN::<32>::random(&env);
    let sig = key.sign(&payload.to_array());
    let entry = AccSignature {
        public_key: owner,
        signature: BytesN::from_array(&env, &sig.to_bytes()),
    };
    let result = env.try_invoke_contract_check_auth::<Error>(
        &id,
        &payload,
        vec![&env, entry].into_val(&env),
        &vec![&env],
    );
    assert!(result.is_ok());
}

#[test]
fn rejects_wrong_key_signature() {
    let env = Env::default();
    let key = signing_key();
    let owner = owner_bytes(&env, &key);
    let id = env.register(Ed25519Account, (owner,));

    let intruder = SigningKey::from_bytes(&[9u8; 32]);
    let payload = BytesN::<32>::random(&env);
    let sig = intruder.sign(&payload.to_array());
    let entry = AccSignature {
        public_key: BytesN::from_array(&env, &intruder.verifying_key().to_bytes()),
        signature: BytesN::from_array(&env, &sig.to_bytes()),
    };
    let result = env.try_invoke_contract_check_auth::<Error>(
        &id,
        &payload,
        vec![&env, entry].into_val(&env),
        &vec![&env],
    );
    assert!(result.is_err());
}

#[test]
fn rejects_empty_signatures() {
    let env = Env::default();
    let key = signing_key();
    let id = env.register(Ed25519Account, (owner_bytes(&env, &key),));
    let payload = BytesN::<32>::random(&env);
    let empty: soroban_sdk::Vec<AccSignature> = vec![&env];
    let result = env.try_invoke_contract_check_auth::<Error>(
        &id,
        &payload,
        empty.into_val(&env),
        &vec![&env],
    );
    assert!(result.is_err());
}
