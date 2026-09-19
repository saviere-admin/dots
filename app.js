// Clean base64 URL decoder with strict error handling
function safeUrlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('Push configuration missing on server.');
  }
  // Strip out quotes, spaces, and linebreaks
  const sanitized = base64String.replace(/["'\s\u200B-\u200D\uFEFF]/g, '').trim();
  const padding = '='.repeat((4 - (sanitized.length % 4)) % 4);
  const base64 = (sanitized + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const enablePushNotifications = async (button) => {
  // Check browser/PWA capabilities
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // Provide actionable feedback on iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && !isStandalone) {
      button.textContent = 'Add to Home Screen first to enable updates';
      return;
    }
    button.textContent = 'Updates unsupported on this browser';
    return;
  }

  // Handle existing 'denied' permission state
  if (Notification.permission === 'denied') {
    button.textContent = 'Notifications blocked in browser settings';
    return;
  }

  button.disabled = true;
  button.textContent = 'Enabling updates…';

  try {
    const configResponse = await fetch(`${apiOrigin}/api/push-config`);
    if (!configResponse.ok) throw new Error('Push service endpoint unavailable.');
    
    const config = await configResponse.json();
    if (!config || !config.publicKey) throw new Error('VAPID key not configured.');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      button.disabled = false;
      button.textContent = 'Notifications blocked in browser settings';
      return;
    }

    const registration = await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;

    const applicationServerKey = safeUrlBase64ToUint8Array(config.publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const response = await fetch(`${apiOrigin}/api/push-subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    if (!response.ok) throw new Error('Failed to save subscription.');

    button.textContent = 'Updates enabled';
  } catch (error) {
    console.error('Push error:', error);
    button.disabled = false;
    button.textContent = error.message || 'Enable product updates';
  }
};