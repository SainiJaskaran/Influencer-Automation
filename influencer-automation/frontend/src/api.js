const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const API_BASE = `${BASE}/influencers`;
const CAMPAIGNS_BASE = `${BASE}/campaigns`;
const SAFETY_BASE = `${BASE}/safety`;
const REPORTS_BASE = `${BASE}/reports`;
const AUTH_BASE = `${BASE}/auth`;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.reload();
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `API error: ${res.status}`);
  }
  return res.json();
}

// --- Auth ---
export function loginUser(email, password) {
  return fetchJSON(`${AUTH_BASE}/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function registerUser(email, password, name) {
  return fetchJSON(`${AUTH_BASE}/register`, {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export function getMe() {
  return fetchJSON(`${AUTH_BASE}/me`);
}

// --- Influencers ---
export function getInfluencers(status) {
  const query = status ? `?status=${status}` : "";
  return fetchJSON(`${API_BASE}${query}`);
}

export function getStats() {
  return fetchJSON(`${API_BASE}/stats`);
}

export function startDiscovery() {
  return fetchJSON(`${API_BASE}/start-discovery`, { method: "POST" });
}

export function startDM() {
  return fetchJSON(`${API_BASE}/start-dm`, { method: "POST" });
}

export function startReplyCheck() {
  return fetchJSON(`${API_BASE}/start-reply-check`, { method: "POST" });
}

export function stopProcess(name = "all") {
  return fetchJSON(`${API_BASE}/stop/${name}`, { method: "POST" });
}

export function getSettings() {
  return fetchJSON(`${API_BASE}/settings`);
}

export function updateSettings(settings) {
  return fetchJSON(`${API_BASE}/settings`, {
    method: "POST",
    body: JSON.stringify(settings),
  });
}

export function deleteInfluencer(id) {
  return fetchJSON(`${API_BASE}/${id}`, { method: "DELETE" });
}

export function getSessionStatus() {
  return fetchJSON(`${API_BASE}/session-status`);
}

export function connectInstagram() {
  return fetchJSON(`${API_BASE}/connect-instagram`, { method: "POST" });
}

export function getConnectStatus() {
  return fetchJSON(`${API_BASE}/connect-status`);
}

export function cancelConnect() {
  return fetchJSON(`${API_BASE}/cancel-connect`, { method: "POST" });
}

export function disconnectInstagram() {
  return fetchJSON(`${API_BASE}/disconnect-instagram`, { method: "POST" });
}

// --- Campaigns ---
export function getCampaigns() {
  return fetchJSON(CAMPAIGNS_BASE);
}

export function getCampaign(id) {
  return fetchJSON(`${CAMPAIGNS_BASE}/${id}`);
}

export function createCampaign(data) {
  return fetchJSON(CAMPAIGNS_BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCampaign(id, data) {
  return fetchJSON(`${CAMPAIGNS_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteCampaign(id) {
  return fetchJSON(`${CAMPAIGNS_BASE}/${id}`, { method: "DELETE" });
}

export function startCampaign(id) {
  return fetchJSON(`${CAMPAIGNS_BASE}/${id}/start`, { method: "POST" });
}

export function pauseCampaign(id) {
  return fetchJSON(`${CAMPAIGNS_BASE}/${id}/pause`, { method: "POST" });
}

export function runCampaignNow(id) {
  return fetchJSON(`${CAMPAIGNS_BASE}/${id}/run`, { method: "POST" });
}

// --- Safety ---
export function getSafetyDashboard() {
  return fetchJSON(`${SAFETY_BASE}/dashboard`);
}

export function getActivityLog(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetchJSON(`${SAFETY_BASE}/activity${query ? `?${query}` : ""}`);
}

export function updateRateLimits(limits) {
  return fetchJSON(`${SAFETY_BASE}/limits`, {
    method: "POST",
    body: JSON.stringify(limits),
  });
}

// --- Reports ---
export function exportCSV(params = {}) {
  const token = localStorage.getItem("token");
  const query = new URLSearchParams(params).toString();
  const url = `${REPORTS_BASE}/export/csv${query ? `?${query}` : ""}`;
  // For file downloads, append token as query param since we can't set headers on window.open
  const separator = url.includes("?") ? "&" : "?";
  window.open(`${url}${separator}token=${token}`, "_blank");
}

export function getConversionFunnel(campaignId) {
  const query = campaignId ? `?campaignId=${campaignId}` : "";
  return fetchJSON(`${REPORTS_BASE}/funnel${query}`);
}

export function getResponseRates() {
  return fetchJSON(`${REPORTS_BASE}/response-rates`);
}

export function getHashtagPerformance() {
  return fetchJSON(`${REPORTS_BASE}/hashtag-performance`);
}

export function getPerformanceOverTime() {
  return fetchJSON(`${REPORTS_BASE}/performance-over-time`);
}
