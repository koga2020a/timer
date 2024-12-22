// src/components/CountdownTimer/TimerDisplay.js

const TimerDisplay = ({ timeLeft, totalTime, sessionCount }) => {
  const shouldShowRedBackground = timeLeft < 0 && Math.floor(Date.now() / 1000) % 2 === 0;

  return (
    <div className={`mb-6 p-4 rounded-lg shadow-inner border border-gray-200 
      ${timeLeft < 0 
        ? `${shouldShowRedBackground ? 'bg-red-100' : 'bg-gray-100'} transition-colors duration-300` 
        : 'bg-gray-100'
      }`}>
      <div className="text-center mb-4">
        <div className="text-5xl font-bold mb-3 text-gray-800 font-mono tracking-wider">
          {formatTime(timeLeft)}
        </div>
        <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${(timeLeft / (timeLeft + totalTime)) * 100}%` }}
          />
        </div>
        <div className="text-gray-700 mb-2 font-medium">
          総活動時間: {formatTime(totalTime)}
        </div>
        <div className="text-sm text-gray-600">
          セッション数: {sessionCount}
        </div>
      </div>
    </div>
  );
};
