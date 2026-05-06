/**
 * ui/logUI.js – Battle log (append-only scrollable)
 */

const MAX_ENTRIES = 100;

export function addLogEntry(text) {
  const container = document.getElementById('log-entries');
  if (!container) return;

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = text;
  container.appendChild(entry);

  // Trim old entries
  while (container.children.length > MAX_ENTRIES) {
    container.removeChild(container.firstChild);
  }

  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}

export function clearLog() {
  const container = document.getElementById('log-entries');
  if (container) container.innerHTML = '';
}
