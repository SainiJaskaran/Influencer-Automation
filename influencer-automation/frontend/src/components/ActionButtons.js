import { startDiscovery, startDM, startReplyCheck, stopProcess } from "../api";

export default function ActionButtons({ onAction }) {
  async function handleAction(action, label) {
    try {
      const result = await action();
      onAction({ type: "success", message: result.message || `${label} started` });
    } catch (err) {
      onAction({ type: "error", message: err.message });
    }
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <button
        onClick={() => handleAction(startDiscovery, "Discovery")}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
      >
        Start Discovery
      </button>
      <button
        onClick={() => handleAction(startDM, "DM")}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
      >
        Start DM
      </button>
      <button
        onClick={() => handleAction(startReplyCheck, "Reply Check")}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition"
      >
        Start Reply Check
      </button>
      <button
        onClick={() => handleAction(() => stopProcess("all"), "Stop")}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
      >
        Stop All
      </button>
    </div>
  );
}
