// src/components/CountdownTimer/CountdownTimer.js

const { useState, useEffect, useRef, useCallback } = React;

// CountdownTimer コンポーネント：メインタイマー
const CountdownTimer = () => {
  const STORAGE_KEY = 'sharedTimerTK';
  const DAILY_RECORDS_KEY = 'sharedTimerTK_dailyRecords';
  
  const { genres, genreColors } = useGenreData();
  const buttonBaseStyle = "transform transition-all duration-100 active:scale-95 shadow-lg hover:shadow-md active:shadow-inner border-b-4 active:border-b-0 active:mt-1";

  // 状態管理
  const [showPopup, setShowPopup] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return typeof parsed.timeLeft === 'number' ? parsed.timeLeft : 0;
      } catch (error) {
        console.error('localStorageの解析エラー:', error);
        return 0;
      }
    }
    return 0;
  });
  const [isRunning, setIsRunning] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).isRunning || false : false;
  });
  const [totalTime, setTotalTime] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).totalTime || 0 : 0;
  });
  const [genreCumulativeSeconds, setGenreCumulativeSeconds] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).genreCumulativeSeconds || {} : {};
  });
  const [sessionCount, setSessionCount] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).sessionCount || 0 : 0;
  });
  const [isPaused, setIsPaused] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).isPaused || false : false;
  });
  const [lastResetDate, setLastResetDate] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).lastResetDate || new Date().toLocaleDateString() : new Date().toLocaleDateString();
  });
  const [initialTime, setInitialTime] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).initialTime || 0 : 0;
  });
  const [alarmContext, setAlarmContext] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [activeTimeMinutes, setActiveTimeMinutes] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).activeTimeMinutes || [] : [];
  });
  const [buttonHistory, setButtonHistory] = useState([]);
  const [currentGenreIndex, setCurrentGenreIndex] = useState(0);
  const [hasTriggeredAlarm, setHasTriggeredAlarm] = useState(false);
  const [timerMode, setTimerMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).timerMode || 'continuous' : 'continuous';
  });
  
  // Refs
  const intervalRef = useRef(null);
  
  const currentGenre = genres[currentGenreIndex];

  // ストレージ関数
  const loadStorageData = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  };

  const saveStorageData = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const loadDailyRecords = () => {
    const saved = localStorage.getItem(DAILY_RECORDS_KEY);
    return saved ? JSON.parse(saved) : [];
  };

  const saveDailyRecords = (records) => {
    localStorage.setItem(DAILY_RECORDS_KEY, JSON.stringify(records));
  };

  // オーディオ関数
  const createBeepWaveform = (ctx, frequency = 880, beepLength = 0.1, interval = 0.2, repeatCount = 5) => {
    const sampleRate = ctx.sampleRate;
    const totalLength = repeatCount * interval;
    const totalSamples = Math.floor(totalLength * sampleRate);
    const beepSamples = Math.floor(beepLength * sampleRate);
    const intervalSamples = Math.floor(interval * sampleRate);

    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let repeat = 0; repeat < repeatCount; repeat++) {
      const startSample = repeat * intervalSamples;
      for (let i = 0; i < beepSamples; i++) {
        const t = i / sampleRate;
        channelData[startSample + i] = Math.sin(2 * Math.PI * frequency * t) * 0.5;
      }
    }
    return buffer;
  };

  const playShortBeep = () => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / audioCtx.sampleRate;
      channelData[i] = Math.sin(2 * Math.PI * 440 * t) * 0.5;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
  };

  const stopAlarm = () => {
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      setAudioContext(null);
    }
    if (alarmContext && alarmContext.state !== 'closed') {
      alarmContext.close();
      setAlarmContext(null);
    }
  };

  const startAlarm = () => {
    stopAlarm();
    const newAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(newAudioCtx);
    setAlarmContext(newAudioCtx);

    const waveform = createBeepWaveform(newAudioCtx);
    const source = newAudioCtx.createBufferSource();
    source.buffer = waveform;
    source.connect(newAudioCtx.destination);
    source.start(0);
    
    addButtonHistory('アラーム発動');
  };

  // 短いアラームを鳴らす関数 マイナス進行時
  const startAlarmAtMinus = () => {
    stopAlarm();
    const newAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(newAudioCtx);
    setAlarmContext(newAudioCtx);

    const waveform = createBeepWaveform(newAudioCtx, 880, 0.1, 0.2, 2);
    const source = newAudioCtx.createBufferSource();
    source.buffer = waveform;
    source.connect(newAudioCtx.destination);
    source.start(0);
  };

  // タイマー制御関数
  const addButtonHistory = (buttonType) => {
    const now = new Date();
    const newHistory = {
      time: now.toLocaleTimeString(),
      buttonType,
      timeLeft: formatTime(timeLeft),
      totalTime: formatTime(totalTime),
      genre: currentGenre
    };
    console.log(`[${newHistory.time}] ${buttonType} - 残り時間: ${formatTime(timeLeft)}`);
    setButtonHistory(prev => [newHistory, ...prev]);
  };

  const setTimerStart = (remainingTime) => {
    setInitialTime(remainingTime);
    setTimeLeft(remainingTime);
    setHasTriggeredAlarm(false);
  };

  const handleTimerStart = (newTime) => {
    if (typeof newTime !== 'number' || isNaN(newTime)) {
      console.error('handleTimerStart: newTime is not a valid number', newTime);
      return;
    }
    setTimerStart(newTime);
    setIsRunning(true);
    setIsPaused(false);
    setHasTriggeredAlarm(false);
    addButtonHistory('開始');
  };

  const handleTimeAdjustment = (adjustment) => {
    console.log('Time adjustment called:', { adjustment, currentTimeLeft: timeLeft, isRunning, isPaused });
    
    let newTime = Math.max(0, timeLeft + adjustment);
    if (typeof newTime !== 'number' || isNaN(newTime)) {
      console.error('handleTimeAdjustment: newTime is not a valid number', newTime);
      return;
    }
    setTimeLeft(newTime);
    setInitialTime(newTime);
    setHasTriggeredAlarm(false);
    
    const actionType = adjustment > 0 ? `+${adjustment}秒` : `${adjustment}秒`;
    addButtonHistory(actionType);
  };

  const handleChangeGenre = () => {
    setCurrentGenreIndex(prevIndex => (prevIndex + 1) % genres.length);
  };

  // 日付変更の処理
  const handleDayChange = useCallback(() => {
    // 前日のデータをdailyRecordsに追加
    const oldDate = lastResetDate;
    if (oldDate) {
      const records = loadDailyRecords();
      const dayOfWeek = getDayOfWeek(oldDate);
      const newRecord = {
        date: oldDate,
        dayOfWeek,
        totalTime,
        genreCumulativeSeconds: {...genreCumulativeSeconds}
      };
      records.push(newRecord);
      saveDailyRecords(records);
    }

    // 各種ステートをリセット
    const currentDate = new Date().toLocaleDateString();
    setLastResetDate(currentDate);
    setActiveTimeMinutes([]);
    setTotalTime(0);
    setSessionCount(0);
    setGenreCumulativeSeconds({});
    setIsRunning(false);
    setIsPaused(false);
    setInitialTime(0);
    setHasTriggeredAlarm(false);
  }, [lastResetDate, totalTime, genreCumulativeSeconds]);

  useEffect(() => {
    const currentDate = new Date().toLocaleDateString();
    if (lastResetDate !== currentDate) {
      handleDayChange();
    }
  }, [lastResetDate, handleDayChange]);

  // activeTimeMinutesとtotalTimeをlocalStorageに保存
  useEffect(() => {
    const storageData = {
      activeTimeMinutes,
      timeLeft,
      totalTime,
      sessionCount,
      lastResetDate,
      genreCumulativeSeconds,
      isRunning,
      isPaused,
      initialTime,
      hasTriggeredAlarm,
      timerMode
    };
    saveStorageData(storageData);
  }, [activeTimeMinutes, timeLeft, totalTime, sessionCount, lastResetDate, genreCumulativeSeconds, isRunning, isPaused, initialTime, hasTriggeredAlarm, timerMode]);

  // activeTimeMinutesを更新
  useEffect(() => {
    if (isRunning && !isPaused) {
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      const timeKey = `${currentHour}:${currentMinute}`;

      if (!activeTimeMinutes.some(entry => entry.time === timeKey && entry.genre === currentGenre)) {
        setActiveTimeMinutes(prev => [...prev, { time: timeKey, genre: currentGenre }]);
      }
    }
  }, [timeLeft, isRunning, isPaused, activeTimeMinutes, currentGenre]);

  // タイマーのセットアップ
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prevTimeLeft => {
          if (prevTimeLeft <= 1) {
            if (timerMode === 'continuous') {
              // 既存のマイナス進行モード
              if (hasTriggeredAlarm && prevTimeLeft % 60 === 0 && prevTimeLeft < -30) {
                startAlarmAtMinus();
              }
              if (!hasTriggeredAlarm) {
                startAlarm();
                setSessionCount(prevCount => prevCount + 1);
                setHasTriggeredAlarm(true);
              }
              return prevTimeLeft - 1;
            } else {
              // 停止モード
              startAlarm();
              setSessionCount(prevCount => prevCount + 1);
              setIsRunning(false);
              return 0;
            }
          }
          return prevTimeLeft - 1;
        });

        setTotalTime(prevTotal => prevTotal + 1);
        setGenreCumulativeSeconds(prev => ({
          ...prev,
          [currentGenre]: (prev[currentGenre] || 0) + 1
        }));
      }, 1000);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, isPaused, currentGenre, hasTriggeredAlarm, timerMode]);

  // キーボードイベントのハンドリング
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'i') {
        setShowPopup(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowPopup(false);
      } else if (showPopup && e.key === '1') {
        console.log(`showPopup at key 1:${showPopup}   timerMode:${timerMode}`);
        setTimerMode(prev => prev === 'continuous' ? 'stop' : 'continuous');
        playShortBeep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPopup, timerMode, playShortBeep]);

  // 日付フォーマット
  const formatDateFunc = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayOfWeek = getDayOfWeek(dateStr);
    return `${year}/${month}/${day} (${dayOfWeek})`;
  };

  const getLast10Records = () => {
    const records = loadDailyRecords();
    const today = new Date().toLocaleDateString();
    const todayRecord = {
      date: today,
      dayOfWeek: getDayOfWeek(today),
      totalTime,
      genreCumulativeSeconds: {...genreCumulativeSeconds}
    };
    return [todayRecord, ...records].slice(0, 10);
  };

  const copyCSV = () => {
    const records = getLast10Records();
    const header = ['日付', '曜日', '総時間', ...genres.map(g => `${g}時間`)];
    const rows = records.map(r => {
      const row = [
        formatDateFunc(r.date),
        r.dayOfWeek,
        formatTime(r.totalTime),
        ...genres.map(g => formatTime(r.genreCumulativeSeconds[g] || 0))
      ];
      return row.join(',');
    });

    const csv = [header.join(','), ...rows].join('\n');

    navigator.clipboard.writeText(csv).then(() => {
      alert('CSVをクリップボードにコピーしました');
    });
  };

  // グローバルなクリックイントでアラームを停止
  useEffect(() => {
    const handleGlobalClick = () => {
      if (alarmContext) {
        stopAlarm();
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [alarmContext]);

  return (
    <div className="flex flex-col md:flex-row max-w-4xl mx-auto gap-6 items-start p-6">
      <Popup 
        showPopup={showPopup} 
        setShowPopup={setShowPopup} 
        getLast10Records={getLast10Records} 
        genres={genres}
        formatDate={formatDateFunc}
        formatTime={formatTime}
        copyCSV={copyCSV}
        timerMode={timerMode}
      />

      <div 
        className="flex-1 px-8 p-6 bg-white rounded-xl shadow-light border border-gray-200 backdrop-blur-sm"
        onClick={alarmContext ? stopAlarm : undefined}
      >
        <TimerDisplay 
          timeLeft={timeLeft}
          totalTime={totalTime}
          sessionCount={sessionCount}
        />

        <div className="mb-6">
          <div 
            className="mb-2 text-center cursor-pointer flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <span 
              className="text-xl font-medium"
              style={{ color: genreColors[currentGenre]?.replace('0.5', '1') || 'inherit' }}
            >
              {currentGenre}
            </span>
          </div>
          <div className="flex justify-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                playShortBeep();
                handleTimeAdjustment(600);
              }}
              className={`${buttonBaseStyle} bg-blue-500 hover:bg-blue-600 border-blue-700 text-white px-4 py-2 rounded-lg shadow-light`}
            >
              +10分
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                playShortBeep();
                handleTimeAdjustment(60);
              }}
              className={`${buttonBaseStyle} bg-green-500 hover:bg-green-600 border-green-700 text-white px-4 py-2 rounded-lg shadow-light`}
            >
              +1分
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                playShortBeep();
                handleTimeAdjustment(10);
              }}
              className={`${buttonBaseStyle} bg-yellow-500 hover:bg-yellow-600 border-yellow-700 text-white px-4 py-2 rounded-lg shadow-light`}
            >
              +10秒
            </button>
          </div>
        </div>

        <Controls 
          isRunning={isRunning}
          isPaused={isPaused}
          handleTimerStart={handleTimerStart}
          handleTimeAdjustment={handleTimeAdjustment}
          stopAlarm={stopAlarm}
          addButtonHistory={addButtonHistory}
          playShortBeep={playShortBeep}
          setIsPaused={setIsPaused} 
          setIsRunning={setIsRunning}
          setTimeLeft={setTimeLeft}
          setInitialTime={setInitialTime}
          intervalRef={intervalRef}
          timeLeft={timeLeft}
        />
      </div>

      <div className="flex flex-col items-center">
        <TimeProgressClock 
          activeMinutes={activeTimeMinutes}
          isRunning={isRunning}
          isPaused={isPaused}
          genreColors={genreColors}
          currentGenre={currentGenre}
          timeLeft={timeLeft}
          currentGenreCumulativeSeconds={genreCumulativeSeconds[currentGenre] || 0}
        />
        <GenreSelector 
          genres={genres}
          genreColors={genreColors}
          currentGenre={currentGenre}
          setCurrentGenreIndex={setCurrentGenreIndex}
          playShortBeep={playShortBeep}
        />
      </div>
    </div>
  );

};
