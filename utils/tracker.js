// utils/trackEvent.js
const { analyticsQueue } = require("./queue");

const trackEvent = (data) => {
  analyticsQueue.add("track-event", data).catch(() => {});
};

module.exports = trackEvent;