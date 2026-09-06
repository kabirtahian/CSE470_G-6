import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { groupAPI, branchAPI, userAPI, memberAPI } from "../api/resources";

const emptyForm = { groupName: "", branchId: "", loanOfficerId: "" };

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [addMemberId, setAddMemberId] = useState({});
  const [meetingForm, setMeetingForm] = useState({});

  function load() {
    setLoading(true);
    Promise.all([groupAPI.list(), branchAPI.list(), userAPI.list({ role: "loan_officer" }), memberAPI.list()])
      .then(([g, b, o, m]) => {
        setGroups(g);
        setBranches(b);
        setOfficers(o);
        setMembers(m);
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load groups."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await groupAPI.create(form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create group.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddMember(groupId) {
    const memberId = addMemberId[groupId];
    if (!memberId) return;
    try {
      await groupAPI.addMember(groupId, memberId);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add member to group.");
    }
  }

  async function handleRemoveMember(groupId, memberId) {
    try {
      await groupAPI.removeMember(groupId, memberId);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove member from group.");
    }
  }

  async function handleReassignOfficer(groupId, loanOfficerId) {
    try {
      await groupAPI.update(groupId, { loanOfficerId: loanOfficerId || null });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not reassign loan officer.");
    }
  }

  async function handleScheduleMeeting(groupId) {
    const data = meetingForm[groupId];
    if (!data?.scheduledDate) return;
    try {
      await groupAPI.scheduleMeeting(groupId, data);
      setMeetingForm({ ...meetingForm, [groupId]: { scheduledDate: "", location: "" } });
      window.location.href = "/meetings";
    } catch (err) {
      setError(err.response?.data?.message || "Could not schedule meeting.");
    }
  }

  const unassignedMembers = (group) => members.filter((m) => m.groupId !== group.id);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Groups</h1>
          <p>Borrower groups, their loan officers, and members.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form className="inline-card" onSubmit={handleSubmit}>
        <h2>Create a group</h2>
        <div className="field-row-3">
          <div className="form-field">
            <label>Group name</label>
            <input name="groupName" value={form.groupName} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label>Branch</label>
            <select name="branchId" value={form.branchId} onChange={handleChange}>
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branchName}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Loan officer</label>
            <select name="loanOfficerId" value={form.loanOfficerId} onChange={handleChange}>
              <option value="">—</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="inline-card-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create group"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="table-empty">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="table-empty">No groups yet.</div>
      ) : (
        groups.map((g) => {
          const isOpen = openId === g.id;
          return (
            <div className="group-card" key={g.id}>
              <button className="group-card-header" onClick={() => setOpenId(isOpen ? null : g.id)}>
                <div>
                  <div className="title">{g.groupName}</div>
                  <div className="meta">
                    {g.branch?.branchName || "No branch"} · {g.members?.length || 0} member(s) · Officer:{" "}
                    {g.loanOfficer?.fullName || "Unassigned"}
                  </div>
                </div>
                <span className={`chevron ${isOpen ? "open" : ""}`}>▶</span>
              </button>
              {isOpen && (
                <div className="group-card-body">
                  <div className="form-field" style={{ maxWidth: 320, marginTop: 16 }}>
                    <label>Reassign loan officer</label>
                    <select
                      value={g.loanOfficerId || ""}
                      onChange={(e) => handleReassignOfficer(g.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {officers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <h3 style={{ fontSize: "0.95rem", marginTop: 20 }}>Members</h3>
                  <table className="data-table data-table-compact">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>National ID</th>
                        <th>KYC</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(g.members || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="muted">
                            No members in this group yet.
                          </td>
                        </tr>
                      ) : (
                        g.members.map((m) => (
                          <tr key={m.id}>
                            <td>{m.fullName}</td>
                            <td>{m.nationalId}</td>
                            <td>{m.kycStatus}</td>
                            <td className="text-right">
                              <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveMember(g.id, m.id)}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div className="row" style={{ marginTop: 12 }}>
                    <select
                      value={addMemberId[g.id] || ""}
                      onChange={(e) => setAddMemberId({ ...addMemberId, [g.id]: e.target.value })}
                    >
                      <option value="">Select a member to add…</option>
                      {unassignedMembers(g).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleAddMember(g.id)}>
                      Add to group
                    </button>
                  </div>

                  <h3 style={{ fontSize: "0.95rem", marginTop: 24 }}>Schedule a meeting</h3>
                  <div className="row">
                    <input
                      type="datetime-local"
                      value={meetingForm[g.id]?.scheduledDate || ""}
                      onChange={(e) =>
                        setMeetingForm({
                          ...meetingForm,
                          [g.id]: { ...meetingForm[g.id], scheduledDate: e.target.value },
                        })
                      }
                    />
                    <input
                      placeholder="Location"
                      value={meetingForm[g.id]?.location || ""}
                      onChange={(e) =>
                        setMeetingForm({
                          ...meetingForm,
                          [g.id]: { ...meetingForm[g.id], location: e.target.value },
                        })
                      }
                    />
                    <button className="btn btn-ghost btn-sm" onClick={() => handleScheduleMeeting(g.id)}>
                      Schedule
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </AppLayout>
  );
}
