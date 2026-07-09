/**
 * REST API helpers for setu-audio HTTP endpoints.
 *
 * These complement the WebSocket connection managed by MicButton.jsx.
 * Used for:
 *   - Session lookup: find an existing in_progress workflow_instance
 *   - Form download URL: retrieve signed URL for a generated PDF
 */

const AUDIO_BASE_URL = (() => {
  // Derive HTTP base URL from the WS_URL env var
  const wsUrl = import.meta.env.VITE_AUDIO_WS_URL || "ws://localhost:8000/ws/audio";
  return wsUrl.replace(/^ws/, "http").replace(/\/ws\/audio$/, "");
})();

/**
 * Look up an existing in_progress workflow instance for a user + scheme.
 *
 * @param {string} userId
 * @param {string} schemeId
 * @returns {Promise<{ workflow_instance_id: string, current_stage: string, status: string } | null>}
 */
export async function lookupSession(userId, schemeId) {
  try {
    const res = await fetch(
      `${AUDIO_BASE_URL}/api/session/${encodeURIComponent(userId)}/${encodeURIComponent(schemeId)}`
    );
    if (res.status === 204) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Get the signed download URL for a generated PDF.
 *
 * @param {string} workflowInstanceId
 * @returns {Promise<{ status: string, download_url?: string, expires_at?: string }>}
 */
export async function getFormDownloadUrl(workflowInstanceId) {
  try {
    const res = await fetch(
      `${AUDIO_BASE_URL}/api/form/${encodeURIComponent(workflowInstanceId)}`
    );
    if (!res.ok) return { status: "pending" };
    return await res.json();
  } catch {
    return { status: "pending" };
  }
}
