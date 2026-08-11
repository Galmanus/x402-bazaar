//! Minimal custom account contract (`__check_auth`) for x402 conformance.
//!
//! The RFP requires the facilitator to validate payments from contract
//! accounts with custom `__check_auth`, not only classic keypairs. This is
//! the smallest honest such account: a single ed25519 owner key, signature
//! format identical to what stellar-sdk's `authorizeEntry` produces
//! (`vec![{ public_key, signature }]`), so a stock client can sign for it.
//!
//! Not a production wallet: no rotation, no multisig, no policy. It exists to
//! exercise the facilitator's verification path end to end on testnet.
#![no_std]
use soroban_sdk::{
    auth::{Context, CustomAccountInterface},
    contract, contracterror, contractimpl, contracttype,
    crypto::Hash,
    Bytes, BytesN, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    NotOwner = 1,
    NoSignature = 2,
}

#[contracttype]
#[derive(Clone)]
pub struct AccSignature {
    pub public_key: BytesN<32>,
    pub signature: BytesN<64>,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Owner,
}

#[contract]
pub struct Ed25519Account;

#[contractimpl]
impl Ed25519Account {
    pub fn __constructor(env: Env, owner: BytesN<32>) {
        env.storage().instance().set(&DataKey::Owner, &owner);
    }

    pub fn owner(env: Env) -> BytesN<32> {
        env.storage().instance().get(&DataKey::Owner).unwrap()
    }
}

#[contractimpl]
impl CustomAccountInterface for Ed25519Account {
    type Error = Error;
    type Signature = Vec<AccSignature>;

    fn __check_auth(
        env: Env,
        signature_payload: Hash<32>,
        signatures: Vec<AccSignature>,
        _auth_contexts: Vec<Context>,
    ) -> Result<(), Error> {
        let owner: BytesN<32> = env.storage().instance().get(&DataKey::Owner).unwrap();
        let sig = signatures.first().ok_or(Error::NoSignature)?;
        if sig.public_key != owner {
            return Err(Error::NotOwner);
        }
        let payload: Bytes = signature_payload.into();
        // Panics on an invalid signature, which the host reports as auth failure.
        env.crypto().ed25519_verify(&sig.public_key, &payload, &sig.signature);
        Ok(())
    }
}

#[cfg(test)]
mod test;
