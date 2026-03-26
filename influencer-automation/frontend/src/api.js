const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api/influencers";
const CAMPAIGNS_BASE = "http://localhost:5000/api/campaigns";
const SAFETY_BASE = "http://localhost:5000/api/safety";
const REPORTS_BASE = "http://localhost:5000/api/reports";

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
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
  const query = new URLSearchParams(params).toString();
  window.open(`${REPORTS_BASE}/export/csv${query ? `?${query}` : ""}`, "_blank");
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
