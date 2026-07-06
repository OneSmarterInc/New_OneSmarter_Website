window.dataLayer = window.dataLayer || [];

function gtag() {
  window.dataLayer.push(arguments);
}

window.gtag = gtag;
window.onesmarterAnalyticsGranted = false;
window.onesmarterCanTrackAnalytics = function () {
  return window.onesmarterAnalyticsGranted === true;
};
window.onesmarterGrantAnalyticsConsent = function () {
  window.onesmarterAnalyticsGranted = true;
  gtag("consent", "update", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
    analytics_storage: "granted",
  });
};

gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
});
gtag("js", new Date());
gtag("config", "G-XYZ4P08JG7", { send_page_view: false });

const analyticsScript = document.createElement("script");
analyticsScript.async = true;
analyticsScript.src = "https://www.googletagmanager.com/gtag/js?id=G-XYZ4P08JG7";
document.head.appendChild(analyticsScript);
