// src/components/CountdownTimer/Popup.js

const Popup = ({ showPopup, setShowPopup, getLast10Records, genres, formatDate, formatTime, copyCSV, timerMode }) => {
  if (!showPopup) return null;

  // 日付をソート: 今日が一番上になるように降順ソート
  const sortedRecords = getLast10Records()
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const getTimerModeDescription = (mode) => {
    switch(mode) {
      case 'continuous':
        return '連続モード';
      case 'stop':
        return '停止モード';
      default:
        return '不明なモード';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50"
      onClick={() => setShowPopup(false)}
      style={{ paddingTop: '100px' }} // 上から100pxの位置に設定
    >
      <div
        className="bg-white p-6 rounded-lg shadow-lg max-w-xl w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl font-bold"
          onClick={() => setShowPopup(false)}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">直近10日の記録</h2>
        <div className="timer-mode-info mb-4">
          <small className="text-gray-500">
          現在のタイマーモード：{timerMode === 'continuous' ? '連続' : '停止'}モード（1キーで切替）
          </small>
        </div>
        <div className="overflow-auto max-h-96">
          <table className="table-auto w-full text-sm border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-center">日付</th>
                <th className="border border-gray-300 px-2 py-1 text-center">総時間</th>
                {genres.map(genre => (
                  <th key={genre} className="border border-gray-300 px-2 py-1 text-center">{genre}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-1">{formatDate(record.date)}</td>
                  <td className="border border-gray-300 px-4 py-1">{formatTime(record.totalTime)}</td>
                  {genres.map(genre => (
                    <td key={genre} className="border border-gray-300 px-4 py-1">
                      {formatTime(record.genreCumulativeSeconds[genre] || 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow-light"
            onClick={copyCSV}
          >
            CSVをコピー
          </button>
        </div>
      </div>
    </div>
  );
};
