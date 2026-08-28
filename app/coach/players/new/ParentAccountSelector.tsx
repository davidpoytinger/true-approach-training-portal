"use client";

import { useMemo, useState } from "react";

type Account = {
  AccountID: number;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone?: string | null;
};

export default function ParentAccountSelector({ accounts }: { accounts: Account[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return accounts
      .filter((account) => `${account.FirstName} ${account.LastName} ${account.Email} ${account.Phone ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [accounts, query]);

  const selected = selectedId ? accounts.find((account) => account.AccountID === selectedId) ?? null : null;

  return (
    <div className="parentAccountLookup">
      <input type="hidden" name="existingAccountId" value={selectedId ?? ""} />
      <div className="label">FIND EXISTING ACCOUNT</div>
      <p className="muted">Search by parent name, email, or phone. If you find them, select the account and you will not need to re-enter their information.</p>

      {selected ? (
        <div className="selectedAccount">
          <div>
            <strong>{selected.FirstName} {selected.LastName}</strong>
            <div className="muted">{selected.Email}{selected.Phone ? ` · ${selected.Phone}` : ""}</div>
          </div>
          <button className="button secondary" type="button" onClick={() => { setSelectedId(null); setQuery(""); }}>Use a different parent</button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Start typing a name, email, or phone"
            autoComplete="off"
          />
          {query.trim().length >= 2 ? (
            <div className="accountSearchResults">
              {matches.map((account) => (
                <button key={account.AccountID} type="button" className="accountSearchResult" onClick={() => setSelectedId(account.AccountID)}>
                  <span><strong>{account.FirstName} {account.LastName}</strong><small>{account.Email}</small></span>
                  <span>{account.Phone || "Select"}</span>
                </button>
              ))}
              {!matches.length ? <div className="accountSearchEmpty">No existing account found. Enter the parent information below to create one.</div> : null}
            </div>
          ) : null}
        </>
      )}

      {!selected ? (
        <div className="newParentFields">
          <div className="label">OR CREATE A NEW PARENT ACCOUNT</div>
          <label>First Name<input name="parentFirstName" type="text" /></label>
          <label>Last Name<input name="parentLastName" type="text" /></label>
          <label>Email<input name="parentEmail" type="email" /></label>
          <label>Phone<input name="parentPhone" type="tel" /></label>
        </div>
      ) : null}
    </div>
  );
}
