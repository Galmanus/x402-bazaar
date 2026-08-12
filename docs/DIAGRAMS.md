# x402-bazaar — technical stack diagrams (Mermaid)

For the SCF Build submission's "high-level visual diagram (Mermaid or similar) and a
plain-English explanation of the technical stack" requirement. Plain-English summary under
each diagram.

## 1. Payment + auto-cataloging flow

What happens end to end when an agent pays for a service and the catalog learns it exists.

```mermaid
sequenceDiagram
    participant A as Agent (buyer)
    participant S as Seller (@x402/express)
    participant F as x402-bazaar facilitator
    participant C as Catalog (SQLite + search)
    participant N as Stellar (Soroban)

    A->>S: GET /resource
    S-->>A: 402 Payment Required (terms)
    A->>A: sign Soroban auth entries (USDC only, no XLM)
    A->>S: GET /resource + payment payload
    S->>F: POST /verify
    F->>N: simulate transfer
    N-->>F: ok
    F-->>S: { isValid: true }
    S->>F: POST /settle
    F->>N: submit fee-sponsored tx
    N-->>F: settled (tx hash)
    F->>C: ingest discovery extension (validated)
    F-->>S: { success, tx } + EXTENSION-RESPONSES: cataloged
    S-->>A: 200 + resource
    Note over A,C: later, any agent —
    A->>F: GET /discovery/search?query=...
    F->>C: rank (BM25 ⊕ embedding)
    C-->>A: results + provenance (distinct payers / credential holders)
```

**Plain English:** the buyer gets an HTTP 402, signs only an authorization for a USDC
transfer (no XLM, no account with the facilitator), and retries. The facilitator verifies
and settles on Stellar using the upstream `@x402/stellar` package — it does not
reimplement payment logic — and pays the network fee itself so the buyer needs only the
payment asset. If the payment carried discovery metadata, the catalog records the service
automatically. Any agent can then find it in natural language, with on-chain provenance
attached so fake volume can be discounted.

## 2. System architecture

The three packages and what each owns.

```mermaid
flowchart TB
    subgraph clients [Buyers and agents]
        direction LR
        SDK["@x402/fetch buyer"]
        MCP["MCP discovery server<br/>search · get · paid_call"]
    end

    subgraph fac [packages/facilitator · Express]
        VS["/verify /settle /supported"]
        UP["/upto/settle (metered capture)"]
        DISC["/discovery/resources<br/>/discovery/search"]
    end

    subgraph baz [packages/bazaar · no HTTP]
        ING["ingest: extractDiscoveryInfo<br/>+ routeTemplate validation"]
        STORE["CatalogStore<br/>node:sqlite + provenance"]
        SEARCH["search: BM25 ⊕ MiniLM (RRF)"]
        CRED["credential gate<br/>distinct holders (Sybil-resistant)"]
    end

    subgraph chain [Stellar]
        EXACT["@x402/stellar<br/>ExactStellarScheme"]
        UPTO["upto-authorization<br/>Soroban contract"]
        SAC["USDC / any SEP-41 SAC"]
    end

    SDK --> VS
    MCP --> DISC
    MCP --> VS
    VS --> EXACT
    UP --> UPTO
    EXACT --> SAC
    UPTO --> SAC
    VS -->|on settle| ING
    ING --> STORE
    ING --> CRED
    STORE --> SEARCH
    DISC --> STORE
    DISC --> SEARCH
```

**Plain English:** `packages/facilitator` is the HTTP service (verify, settle, supported,
the upto capture endpoint, and the two discovery endpoints). `packages/bazaar` is a
pure library — no HTTP — that owns the catalog store, search, cataloging, and the
Sybil-resistant credential gate. Settlement itself is delegated to the upstream
`@x402/stellar` scheme (`exact`) and our small `upto` Soroban contract. Every arrow into
Stellar terminates at a token contract; the facilitator is never a party to the transfer.

## 3. Deliverable tranches

```mermaid
flowchart LR
    T1["Tranche 1 — $40K<br/>Facilitator, conformance-hardened<br/>public testnet · error codes<br/>official e2e suite · rate limiting"]
    T2["Tranche 2 — $70K<br/>Bazaar (search, integrity, MCP)<br/>+ upto scheme upstream PR<br/>+ SDKs + dev guide"]
    T3["Tranche 3 — $40K<br/>Mainnet launch · Audit Bank review<br/>production · runbook · monitoring<br/>maintenance commitment"]
    T1 --> T2 --> T3
```

**Plain English:** three tranches totaling $150K, the largest on the Bazaar and the `upto`
scheme (the work the RFP itself calls "novel"), and the final tranche is the production
mainnet launch — de-risked because a real mainnet settlement is already live.
