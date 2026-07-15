const GA_MEASUREMENT_ID = "G-XYZ4P08JG7";
const CONSENT_STORAGE_KEY = "onesmarter_analytics_consent";

window.dataLayer = window.dataLayer || [];

function gtag() {
  window.dataLayer.push(arguments);
}

window.gtag = gtag;

function getStoredConsent() {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeConsent(value) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Ignore localStorage errors.
  }
}

window.onesmarterAnalyticsGranted = getStoredConsent() === "granted";

window.onesmarterCanTrackAnalytics = function () {
  return window.onesmarterAnalyticsGranted === true;
};

gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  wait_for_update: 500,
});

if (window.onesmarterAnalyticsGranted) {
  gtag("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

gtag("js", new Date());
gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

const analyticsScript = document.createElement("script");
analyticsScript.async = true;
analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
document.head.appendChild(analyticsScript);

function updateAnalyticsConsent(granted) {
  window.onesmarterAnalyticsGranted = granted === true;
  storeConsent(granted ? "granted" : "denied");

  gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

window.onesmarterGrantAnalyticsConsent = function () {
  updateAnalyticsConsent(true);
  window.onesmarterHideCookieBanner?.();
};

window.onesmarterDenyAnalyticsConsent = function () {
  updateAnalyticsConsent(false);
  window.onesmarterHideCookieBanner?.();
};

window.onesmarterHideCookieBanner = function () {
  const banner = document.getElementById("onesmarter-cookie-banner");
  if (banner) {
    banner.remove();
  }
};

window.onesmarterOpenCookieSettings = function () {
  renderCookieBanner(true);
};

window.addEventListener("onesmarter:open-cookie-settings", () => {
  renderCookieBanner(true);
});

function renderCookieBanner(force = false) {
  if (!force && getStoredConsent()) return;
  if (document.getElementById("onesmarter-cookie-banner")) return;

  const banner = document.createElement("section");
  banner.id = "onesmarter-cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Cookie settings");
  banner.style.cssText = `
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: 16px;
    z-index: 99999;
    max-width: 960px;
    margin: 0 auto;
    background: #18181b;
    color: #ffffff;
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 16px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.35);
    padding: 20px;
    font-family: Arial, sans-serif;
  `;

  banner.innerHTML = `
    <div style="display:flex; gap:16px; align-items:flex-start; justify-content:space-between; flex-wrap:wrap;">
      <div style="max-width:680px;">
        <h2 style="font-size:16px; margin:0 0 8px; color:#ffffff;">Cookie & Analytics Preferences</h2>
        <p style="font-size:14px; line-height:1.6; margin:0; color:#d4d4d8;">
          We use Google Analytics 4 to understand website usage and improve our services.
          If you reject analytics cookies, analytics cookies will not be stored on your device.
          Because Google Consent Mode is enabled, limited cookieless measurement signals may still be processed for aggregated measurement.
        </p>
        <a href="/policies/privacy-policy" style="display:inline-block; margin-top:8px; font-size:13px; color:#f87171; text-decoration:none;">
          Read Privacy Policy
        </a>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button id="onesmarter-reject-analytics" type="button" style="border:1px solid rgba(255,255,255,0.24); background:transparent; color:#ffffff; border-radius:999px; padding:10px 14px; cursor:pointer;">
          Reject Analytics
        </button>
        <button id="onesmarter-accept-analytics" type="button" style="border:1px solid #dc2626; background:#dc2626; color:#ffffff; border-radius:999px; padding:10px 14px; cursor:pointer;">
          Accept Analytics
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  document
    .getElementById("onesmarter-accept-analytics")
    ?.addEventListener("click", window.onesmarterGrantAnalyticsConsent);

  document
    .getElementById("onesmarter-reject-analytics")
    ?.addEventListener("click", window.onesmarterDenyAnalyticsConsent);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => renderCookieBanner(false));
} else {
  renderCookieBanner(false);
}
