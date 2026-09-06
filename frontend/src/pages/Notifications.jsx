import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { notificationAPI } from "../api/resources";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    notificationAPI
      .list()
      .then(setNotifications)
      .catch((err) => setError(err.response?.data?.message || "Could not load notifications."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleMarkRead(id) {
    setBusyId(id);
    try {
      await notificationAPI.markRead(id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update notification.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>In-app alerts, including overdue installment notices for your groups.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="table-empty">No notifications yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Message</th>
                <th>Channel</th>
                <th>Sent</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} style={{ opacity: n.status === "read" ? 0.6 : 1 }}>
                  <td>{n.message}</td>
                  <td>{n.channel}</td>
                  <td>{new Date(n.sentDate).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${n.status === "read" ? "badge-verified" : "badge-pending"}`}>{n.status}</span>
                  </td>
                  <td className="text-right">
                    {n.status === "unread" && (
                      <button className="btn btn-ghost btn-sm" disabled={busyId === n.id} onClick={() => handleMarkRead(n.id)}>
                        Mark read
                      </button>
                    )}
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
