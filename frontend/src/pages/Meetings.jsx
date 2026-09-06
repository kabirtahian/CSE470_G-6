import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { meetingAPI } from "../api/resources";

function StatusBadge({ status }) {
  const cls = status === "completed" ? "badge-verified" : status === "cancelled" ? "badge-rejected" : "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    meetingAPI
      .list()
      .then(setMeetings)
      .catch((err) => setError(err.response?.data?.message || "Could not load meetings."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleStatusChange(id, status) {
    setBusyId(id);
    try {
      await meetingAPI.update(id, { status });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update meeting.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Meetings</h1>
          <p>Group meeting and collection scheduling. New meetings are scheduled from a group's card on the Groups page.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : meetings.length === 0 ? (
          <div className="table-empty">No meetings scheduled yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Scheduled</th>
                <th>Location</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id}>
                  <td>{m.group?.groupName}</td>
                  <td>{new Date(m.scheduledDate).toLocaleString()}</td>
                  <td>{m.location || "—"}</td>
                  <td>
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="text-right">
                    <select
                      value={m.status}
                      disabled={busyId === m.id}
                      onChange={(e) => handleStatusChange(m.id, e.target.value)}
                    >
                      <option value="scheduled">scheduled</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
