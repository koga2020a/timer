// src/utils/helpers.js

// ヘルパー関数：秒を分:秒形式にフォーマット
const formatTime = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return '00:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ヘルパー関数：日付から曜日を取得
const getDayOfWeek = (dateString) => {
  const date = new Date(dateString);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days[date.getDay()];
};
