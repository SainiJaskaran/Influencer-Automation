import { useState } from "react";
import { createCampaign, updateCampaign } from "../api";

const SCHEDULE_PRESETS = [
  { label: "Daily at 9:00 AM", value: "0 9 * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
  { label: "Monday at 10:00 AM", value: "0 10 * * 1" },
  { label: "Weekdays at 9:00 AM", value: "0 9 * * 1-5" },
  { label: "Custom", value: "custom" },
];

const STEPS = [
  { key: "discovery", label: "Discovery", desc: "Find new influencers" },
  { key: "send-dm", label: "Send DMs", desc: "Message new contacts" },
  { key: "check-replies", label: "Check Replies", desc: "Monitor responses" },
];

export default function CampaignForm({ campaign, onDone, onCancel }) {
  const isEdit = !!campaign;

  const [form, setForm] = useState({
    name: campaign?.name || "",
    hashtags: (campaign?.hashtags || []).join(", "),
    minFollowers: campaign?.filters?.minFollowers || 10000,
    maxFollowers: campaign?.filters?.maxFollowers || 200000,
    minEngagement: campaign?.filters?.minEngagement || 2,
    minReach: campaign?.filters?.minReach || 3000,
    schedule: campaign?.schedule || "0 9 * * *",
    customSchedule: "",
    automationSteps: campaign?.automationSteps || STEPS.map((s) => s.key),
    messageTemplate: (campaign?.messageTemplates || [])[0] || "",
  });
  const [saving, setSaving] = useState(false);

  const isCustomSchedule = !SCHEDULE_PRESETS.some(
    (p) => p.value !== "custom" && p.value === form.schedule
  );

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function toggleStep(key) {
    setForm((prev) => ({
      ...prev,
      automationSteps: prev.automationSteps.includes(key)
        ? prev.automationSteps.filter((s) => s !== key)
        : [...prev.automationSteps, key],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const schedule = isCustomSchedule ? form.customSchedule || form.schedule : form.schedule;

    const payload = {
      name: form.name.trim(),
      hashtags: form.hashtags.split(",").map((h) => h.trim()).filter(Boolean),
      filters: {
        minFollowers: Number(form.minFollowers),
        maxFollowers: Number(form.maxFollowers),
        minEngagement: Number(form.minEngagement),
        minReach: Number(form.minReach),
      },
      schedule,
      automationSteps: form.automationSteps,
      messageTemplates: form.messageTemplate.trim() ? [form.messageTemplate.trim()] : [],
    };

    try {
      if (isEdit) {
        await updateCampaign(campaign._id, payload);
        onDone(`Campaign "${payload.name}" updated`);
      } else {
        await createCampaign(payload);
        onDone(`Campaign "${payload.name}" created`);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
    setSaving(false);
  }

  return (
    <div className="card p-6">
      <h3 className="text-base font-semibold text-surface-900 mb-5">
        {isEdit ? "Edit Campaign" : "Create New Campaign"}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Name + Hashtags */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="label">Campaign Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required className="input" placeholder="Summer Skincare Outreach" />
          </div>
          <div className="lg:col-span-2">
            <label className="label">Target Hashtags</label>
            <input type="text" name="hashtags" value={form.hashtags} onChange={handleChange} className="input" placeholder="skincare, beauty, makeup" />
          </div>
        </div>

        {/* Row 2: Filters */}
        <div>
          <p className="label mb-3">Filters</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-surface-500 mb-1">Min Followers</label>
              <input type="number" name="minFollowers" value={form.minFollowers} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">Max Followers</label>
              <input type="number" name="maxFollowers" value={form.maxFollowers} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">Min Engagement %</label>
              <input type="number" name="minEngagement" value={form.minEngagement} onChange={handleChange} step="0.5" className="input" />
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">Min Reach</label>
              <input type="number" name="minReach" value={form.minReach} onChange={handleChange} className="input" />
            </div>
          </div>
        </div>

        {/* Row 3: Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="label">Schedule</label>
            <select
              name="schedule"
              value={isCustomSchedule ? "custom" : form.schedule}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  setForm({ ...form, schedule: form.schedule, customSchedule: form.schedule });
                } else {
                  setForm({ ...form, schedule: e.target.value });
                }
              }}
              className="select"
            >
              {SCHEDULE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          {isCustomSchedule && (
            <div>
              <label className="label">Cron Expression</label>
              <input
                type="text"
                value={form.customSchedule || form.schedule}
                onChange={(e) => setForm({ ...form, customSchedule: e.target.value, schedule: e.target.value })}
                className="input font-mono"
                placeholder="0 9 * * *"
              />
            </div>
          )}
        </div>

        {/* Row 4: Steps */}
        <div>
          <p className="label mb-3">Automation Steps</p>
          <div className="grid grid-cols-3 gap-3">
            {STEPS.map((step) => {
              const active = form.automationSteps.includes(step.key);
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => toggleStep(step.key)}
                  className={`p-3 rounded-lg border-2 text-left transition-all duration-150 ${
                    active
                      ? "border-brand-500 bg-brand-50/50"
                      : "border-surface-200 hover:border-surface-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      active ? "bg-brand-600 border-brand-600" : "border-surface-300"
                    }`}>
                      {active && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-semibold ${active ? "text-brand-700" : "text-surface-700"}`}>{step.label}</span>
                  </div>
                  <p className="text-[11px] text-surface-400 mt-1 ml-6">{step.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 5: Message template */}
        <div>
          <label className="label">Message Template (optional)</label>
          <textarea
            name="messageTemplate"
            value={form.messageTemplate}
            onChange={handleChange}
            rows={3}
            className="input resize-none"
            placeholder="Hi {name}, I came across your {niche} content..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary text-xs disabled:opacity-50">
            {saving ? "Saving..." : isEdit ? "Update Campaign" : "Create Campaign"}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary text-xs">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
