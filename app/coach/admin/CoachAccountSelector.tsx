"use client";

import { useMemo, useState } from "react";
import styles from "./CoachAccountSelector.module.css";

type Account = {
  AccountID: number;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone?: string | null;
};

export default function CoachAccountSelector({ accounts }: { accounts: Account[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return accounts
      .filter(account => `${account.FirstName} ${account.LastName} ${account.Email} ${account.Phone ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [accounts, query]);

  const selected = selectedId ? accounts.find(account => account.AccountID === selectedId) ?? null : null;

  return (
    <div className={styles.lookup}>
      <input type="hidden" name="existingAccountId" value={selectedId ?? ""} />
      <div className="label">FIND EXISTING DUGOUT ACCOUNT</div>
      <p className="muted">Search by name, email, or phone. Select an account to grant coach access without re-entering their information.</p>

      {selected ? (
        <div className={styles.selected}>
          <div>
            <strong>{selected.FirstName} {selected.LastName}</strong>
            <div className="muted">{selected.Email}{selected.Phone ? ` · ${selected.Phone}` : ""}</div>
          </div>
          <button className="button secondary" type="button" onClick={() => { setSelectedId(null); setQuery(""); }}>Use a different account</button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Start typing a name, email, or phone"
            autoComplete="off"
          />
          {query.trim().length >= 2 ? (
            <div className={styles.results}>
              {matches.map(account => (
                <button key={account.AccountID} type="button" className={styles.result} onClick={() => setSelectedId(account.AccountID)}>
                  <span><strong>{account.FirstName} {account.LastName}</strong><small>{account.Email}</small></span>
                  <span>{account.Phone || "Select"}</span>
                </button>
              ))}
              {!matches.length ? <div className={styles.empty}>No matching Dugout account found. Create a new coach account below.</div> : null}
            </div>
          ) : null}
        </>
      )}

      {!selected ? (
        <div className={styles.newFields}>
          <div className="label">OR CREATE A NEW COACH ACCOUNT</div>
          <label>First Name<input name="firstName" /></label>
          <label>Last Name<input name="lastName" /></label>
          <label>Email<input name="email" type="email" /></label>
          <label>Phone<input name="phone" type="tel" /></label>
          <label>Temporary Password<input name="temporaryPassword" type="password" minLength={8} placeholder="At least 8 characters" /></label>
        </div>
      ) : null}
    </div>
  );
}
