/**
 * ui/floatMsgUI.js – Floating message overlay manager
 *
 * showFloatMsg     – fire-and-forget; new message immediately replaces current one.
 * showFloatMsgAsync – awaitable; resolves after the message fades out.
 */

let _timeout = null;

function _show(text, durationMs, resolve) {
  const el      = document.getElementById('float-msg');
  const overlay = document.getElementById('float-msg-overlay');
  if (!el || !overlay) { resolve && resolve(); return; }

  // Cancel any in-flight timeout so the new message shows instantly.
  if (_timeout) { clearTimeout(_timeout); _timeout = null; }

  el.textContent = text;
  overlay.classList.add('visible');

  _timeout = setTimeout(() => {
    overlay.classList.remove('visible');
    _timeout = null;
    if (resolve) setTimeout(resolve, 200);
  }, durationMs);
}

/** Show a floating message (fire-and-forget). Replaces any current message. */
export function showFloatMsg(text, durationMs = 2200) {
  _show(text, durationMs, null);
}

/** Show a message and return a Promise that resolves after it fades out. */
export function showFloatMsgAsync(text, durationMs = 1500) {
  return new Promise(resolve => _show(text, durationMs, resolve));
}
