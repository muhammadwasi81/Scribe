const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;
const ONE_MONTH = 30 * ONE_DAY;
const ONE_YEAR = 365 * ONE_DAY;
export function timeElapsed(createdAt) {
  const dateDiff = Date.now() - Date.parse(createdAt);

  if (dateDiff < ONE_MINUTE) {
    return "Just now";
  } else if (dateDiff < ONE_HOUR) {
    return Math.floor(dateDiff / ONE_MINUTE) + " minutes ago";
  } else if (dateDiff < ONE_DAY) {
    return Math.floor(dateDiff / ONE_HOUR) + " hours ago";
  } else if (dateDiff < ONE_WEEK) {
    return Math.floor(dateDiff / ONE_DAY) + " days ago";
  } else if (dateDiff < ONE_MONTH) {
    return Math.floor(dateDiff / ONE_WEEK) + " weeks ago";
  } else if (dateDiff < ONE_YEAR) {
    return Math.floor(dateDiff / ONE_MONTH) + " months ago";
  } else {
    return Math.floor(dateDiff / ONE_YEAR) + " years ago";
  }
}
