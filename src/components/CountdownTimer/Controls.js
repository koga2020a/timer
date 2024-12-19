// src/components/CountdownTimer/Controls.js

const Controls = ({
  isRunning, 
  isPaused, 
  handleTimerStart, 
  handleTimeAdjustment, 
  stopAlarm,
  addButtonHistory,
  playShortBeep,
  setIsPaused, 
  setIsRunning,
  setTimeLeft,
  setInitialTime,
  intervalRef,
  timeLeft // 追加
}) => {
  const buttonBaseStyle = "transform transition-all duration-100 active:scale-95 shadow-lg hover:shadow-md active:shadow-inner border-b-4 active:border-b-0 active:mt-1";

  useEffect(() => {
    console.log('Controls - timeLeft:', timeLeft);
  }, [timeLeft]);

  return (
    <div className="flex justify-center gap-4">
      {!isRunning ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            playShortBeep();
            if (timeLeft > 0) {
              handleTimerStart(timeLeft);
            } else {
              const initialSeconds = 5 * 60;
              handleTimerStart(initialSeconds);
            }
          }}
          className={`${buttonBaseStyle} bg-green-500 hover:bg-green-600 border-green-700 text-white px-6 py-3 rounded-lg shadow-light`}
        >
          開始
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            playShortBeep();
            if (isPaused) {
              setIsPaused(false);
              setIsRunning(true);
              addButtonHistory('再開');
            } else {
              setIsPaused(true);
              setIsRunning(false);
              addButtonHistory('一時停止');
            }
          }}
          className={`${buttonBaseStyle} ${
            isPaused 
              ? 'bg-green-500 hover:bg-green-600 border-green-700' 
              : 'bg-red-500 hover:bg-red-600 border-red-700'
          } text-white px-6 py-3 rounded-lg shadow-light`}
        >
          {isPaused ? '再開' : '一時停止'}
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          playShortBeep();
          stopAlarm();
          setIsRunning(false);
          setIsPaused(false);
          setTimeLeft(0);
          setInitialTime(0);
          clearInterval(intervalRef.current);
          addButtonHistory('リセット');
        }}
        className={`${buttonBaseStyle} bg-gray-500 hover:bg-gray-600 border-gray-700 text-white px-6 py-3 rounded-lg shadow-light`}
      >
        リセット
      </button>
    </div>
  );
};
