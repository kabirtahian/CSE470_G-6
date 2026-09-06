import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { userAPI, groupAPI } from "../api/resources";

export default function FieldOfficers() {
  const [officers, setOfficers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    Promise.all([userAPI.list({ role: "loan_officer" }), groupAPI.list()])
      .then(([o, g]) => {
        setOfficers(o);
        setGroups(g);
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load field officers."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function groupsFor(officerId) {
    return groups.filter((g) => g.loanOfficerId === officerId);
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Field Officers</h1>
          <p>Loan officers, the groups they manage, and their member counts. Reassign a group's officer from the Groups page.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : officers.length === 0 ? (
          <div className="table-empty">No loan officers registered yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Managed groups</th>
                <th>Total members</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((o) => {
                const managed = groupsFor(o.id);
                const totalMembers = managed.reduce((sum, g) => sum + (g.members?.length || 0), 0);
                return (
                  <tr key={o.id}>
                    <td>{o.fullName}</td>
                    <td>{o.email}</td>
                    <td>{managed.length ? managed.map((g) => g.groupName).join(", ") : "—"}</td>
                    <td>{totalMembers}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
