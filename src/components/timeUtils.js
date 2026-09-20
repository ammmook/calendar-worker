export const isValidTimeValue = (value) => {
  if (!/^\d{2}:\d{2}$/.test(String(value || ''))) return false;
  const [hour, minute] = String(value).split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
};
