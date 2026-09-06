import axios from "axios";

// Separate axios instance + token for the Borrower Portal. Deliberately
// independent from api/client.js (the staff client) so a staff session and
// a borrower session can coexist in the same browser without either one's
// token leaking into the other's requests.
const portalClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

portalClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("mfnet_portal_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("mfnet_portal_token");
      localStorage.removeItem("mfnet_portal_member");
      if (!window.location.pathname.startsWith("/portal/login")) {
        window.location.href = "/portal/login";
      }
    }
    return Promise.reject(error);
  }
);

export default portalClient;
