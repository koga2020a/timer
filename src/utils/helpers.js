// src/utils/helpers.js

// ヘルパー関数：秒を分:秒形式にフォーマット
const formatTime = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return '00:00';
  }
  const abs_seconds = Math.abs(seconds);
  const minusChar = (seconds < 0) ? ' -' : '';
  const mins = Math.floor(abs_seconds / 60);
  const secs = abs_seconds % 60;
  return `${minusChar}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// ヘルパー関数：日付から曜日を取得
const getDayOfWeek = (dateString) => {
  const date = new Date(dateString);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days[date.getDay()];
};
