const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api/influencers";

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

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
