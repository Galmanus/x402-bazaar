//! upto-authorization — the Soroban contract behind the x402 `upto` scheme on
//! Stellar (authorize up to a cap, settle actual usage once).
//!
//! Why a contract at all: SEP-41 allowances alone cannot enforce the two
//! guarantees the upto spec requires — recipient binding and single
//! settlement. An allowance says "spender may move up to N of my tokens"; it
//! says nothing about WHERE they go or HOW MANY TIMES. Here the spender is
//! this contract, and this contract's code pins both.
//!
//! Flow (two transactions, both facilitator-submitted and fee-sponsored):
//!   1. `authorize` — the buyer signs one auth entry covering this call AND
//!      its `token.approve(buyer, this_contract, cap, live_until)`
//!      sub-invocation. Every value is known at signing time. The
//!      authorization tuple (buyer, recipient, token, cap, expiry, auth_id)
//!      is stored under `auth_id`.
//!   2. `settle` — the seller's facilitator settles the ACTUAL usage
//!      (`actual <= cap`), exactly once. No buyer signature is needed at
//!      settle time — that is the point of upto. Funds move buyer→recipient
//!      directly via `transfer_from`; the contract never holds them.
//!
//! Inherited requirements from the riverrun/vineland security audit
//! (docs/THREAT_MODEL.md, "Planned upto contract"), enforced here:
//!   F11 — every context field is pinned inside the buyer-signed tuple:
//!         recipient, token, cap, expiry, auth_id. An unpinned field is an
//!         unlimited-use field.
//!   F8  — the settlement tag is `auth_id`, a caller-supplied `BytesN<32>`:
//!         fixed-length canonical bytes by construction, no re-encoding
//!         between signing and storage that could fork one authorization
//!         into many.
//!   F4  — verify-then-burn: `settle` validates everything, then marks
//!         settled, then transfers; a rejected settle consumes nothing, and
//!         a failed transfer reverts the burn with it (same transaction).
//!   F5  — `Settled` and `Auth` state live in `persistent()` storage, never
//!         `temporary()`: archived entries are restorable, deleted ones
//!         would make an authorization reusable.
//!   F2  — parameters are not free config: zero/negative caps and amounts
//!         are refused, and expiry must be in the future at authorize time.
#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, BytesN, Env,
};

/// Keep nullifiers alive ~1 year so a settled tag stays cheap to check.
const SETTLED_TTL_LEDGERS: u32 = 6_307_200; // ~365d at 5s/ledger
const AUTH_TTL_MARGIN_LEDGERS: u32 = 17_280; // keep Auth ~1 day past expiry

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    BadAmount = 1,
    BadExpiry = 2,
    AuthExists = 3,
    NotFound = 4,
    Expired = 5,
    CapExceeded = 6,
    AlreadySettled = 7,
}

#[contracttype]
#[derive(Clone)]
pub struct Authorization {
    pub buyer: Address,
    pub recipient: Address,
    pub token: Address,
    pub cap: i128,
    pub expiry_ledger: u32,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Auth(BytesN<32>),
    Settled(BytesN<32>),
}

#[contract]
pub struct UptoAuthorization;

#[contractimpl]
impl UptoAuthorization {
    /// Buyer-signed. Records the authorization and takes a token allowance
    /// (to THIS contract) for `cap`, expiring at `expiry_ledger`. The buyer's
    /// single auth entry covers both this call and the approve sub-call.
    pub fn authorize(
        env: Env,
        buyer: Address,
        recipient: Address,
        token: Address,
        cap: i128,
        expiry_ledger: u32,
        auth_id: BytesN<32>,
    ) -> Result<(), Error> {
        // F11: the buyer signs THIS argument tuple — recipient, token, cap,
        // expiry and auth_id are all pinned by the signature.
        buyer.require_auth();
        if cap <= 0 {
            return Err(Error::BadAmount);
        }
        if expiry_ledger <= env.ledger().sequence() {
            return Err(Error::BadExpiry);
        }
        let auth_key = DataKey::Auth(auth_id.clone());
        let settled_key = DataKey::Settled(auth_id);
        // A repeated auth_id must not overwrite a live or settled authorization.
        if env.storage().persistent().has(&auth_key) || env.storage().persistent().has(&settled_key)
        {
            return Err(Error::AuthExists);
        }
        // Allowance to this contract, bounded by the same expiry the buyer signed.
        token::Client::new(&env, &token).approve(&buyer, &env.current_contract_address(), &cap, &expiry_ledger);
        let auth = Authorization { buyer, recipient, token, cap, expiry_ledger };
        env.storage().persistent().set(&auth_key, &auth);
        env.storage().persistent().extend_ttl(
            &auth_key,
            expiry_ledger.saturating_sub(env.ledger().sequence()),
            expiry_ledger.saturating_sub(env.ledger().sequence()) + AUTH_TTL_MARGIN_LEDGERS,
        );
        Ok(())
    }

    /// Facilitator-called (permissionless: everything that matters was pinned
    /// by the buyer's signature). Settles the actual usage, once.
    pub fn settle(env: Env, auth_id: BytesN<32>, actual: i128) -> Result<(), Error> {
        if actual <= 0 {
            return Err(Error::BadAmount);
        }
        let settled_key = DataKey::Settled(auth_id.clone());
        // F4/F8: the single-use check is first, on the exact stored tag.
        if env.storage().persistent().has(&settled_key) {
            return Err(Error::AlreadySettled);
        }
        let auth_key = DataKey::Auth(auth_id);
        let auth: Authorization = env
            .storage()
            .persistent()
            .get(&auth_key)
            .ok_or(Error::NotFound)?;
        if env.ledger().sequence() > auth.expiry_ledger {
            return Err(Error::Expired);
        }
        if actual > auth.cap {
            return Err(Error::CapExceeded);
        }
        // F4: burn before the transfer, in the same transaction — a failed
        // transfer reverts the burn; a successful burn can never be re-run.
        env.storage().persistent().set(&settled_key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&settled_key, SETTLED_TTL_LEDGERS, SETTLED_TTL_LEDGERS);
        env.storage().persistent().remove(&auth_key);
        // Funds move buyer→recipient directly; this contract is spender, not holder.
        token::Client::new(&env, &auth.token).transfer_from(
            &env.current_contract_address(),
            &auth.buyer,
            &auth.recipient,
            &actual,
        );
        env.events().publish(
            (soroban_sdk::symbol_short!("settled"),),
            (auth.buyer, auth.recipient, actual, auth.cap),
        );
        Ok(())
    }

    /// Read-only: the stored authorization, if still live.
    pub fn authorization(env: Env, auth_id: BytesN<32>) -> Option<Authorization> {
        env.storage().persistent().get(&DataKey::Auth(auth_id))
    }

    /// Read-only: has this authorization been settled.
    pub fn settled(env: Env, auth_id: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Settled(auth_id))
    }
}

#[cfg(test)]
mod test;
