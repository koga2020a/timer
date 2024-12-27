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

  // 新しい状態変数：フラッシュ効果用
  const [flashTotalTime, setFlashTotalTime] = useState(false);
  const [flashGenreTime, setFlashGenreTime] = useState(false);

  // 新しい状態変数：総調整時間（上下矢印キーでの調整合計）
  const [cumulativeAdjustSeconds, setCumulativeAdjustSeconds] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).cumulativeAdjustSeconds || 0 : 0;
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

  // 短いアラームを鳴らす関数 開始時
  const startAlarmAtStart = () => {
    stopAlarm();
    const newAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(newAudioCtx);
    setAlarmContext(newAudioCtx);

    const waveform = createBeepWaveform(newAudioCtx, 680, 0.1, 0.2, 2);
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
    
    let newTime = timeLeft + adjustment;
    if (newTime < 0) newTime = 0; // 負の時間を許容しない

    if (typeof newTime !== 'number' || isNaN(newTime)) {
      console.error('handleTimeAdjustment: newTime is not a valid number', newTime);
      return;
    }
    setTimeLeft(newTime);
    setInitialTime(newTime);
    setHasTriggeredAlarm(false);
    
    const actionType = adjustment > 0 ? `+${adjustment / 60}分` : `${adjustment / 60}分`;
    addButtonHistory(actionType);
  };

  const handleChangeGenre = () => {
    setCurrentGenreIndex(prevIndex => (prevIndex + 1) % genres.length);
  };

  // 新しい関数：タイマーモードをトグル
  const toggleTimerMode = () => {
    setTimerMode(prevMode => {
      const newMode = prevMode === 'continuous' ? 'stop' : 'continuous';
      addButtonHistory(`タイマーモード: ${newMode === 'continuous' ? '連続' : '停止'}`);
      playShortBeep();
      return newMode;
    });
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
    setCumulativeAdjustSeconds(0); // 総調整時間をリセット
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
      timerMode,
      cumulativeAdjustSeconds
    };
    saveStorageData(storageData);
  }, [activeTimeMinutes, timeLeft, totalTime, sessionCount, lastResetDate, genreCumulativeSeconds, isRunning, isPaused, initialTime, hasTriggeredAlarm, timerMode, cumulativeAdjustSeconds]);

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

        // `totalTime` が必要ない場合は以下を削除またはコメントアウト
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
      const addTimeKeys = ['q', 'a', 'z'];
      
      if (e.key === ' ' || e.key.toLowerCase() === 'p') { // スペースキー または pキー
        e.preventDefault(); // スクロールなどのデフォルト動作を防止
        if (isRunning && !isPaused) {
          setIsPaused(true);
          addButtonHistory('一時停止');
          playShortBeep();
        }
        // 一時停止状態でスペースキーを押しても何もしない
      } else if (addTimeKeys.includes(e.key.toLowerCase())) { // q, a, z キー
        e.preventDefault(); // 必要に応じてデフォルトの動作を防止
        if (isRunning) {
          handleTimeAdjustment(60); // 1分追加
          if (isPaused) {
            setIsPaused(false); // 一時停止中なら再開
            addButtonHistory('開始'); // 再開の履歴を追加
          }
        } else {
          handleTimerStart(timeLeft + 60); // 1分追加してタイマー開始
        }
        playShortBeep();
        //startAlarmAtStart();
      } else if (e.key === 'Enter') { // Enterキー
        e.preventDefault();
        if (isRunning && isPaused) {
          setIsPaused(false);
          addButtonHistory('再開');
          playShortBeep();
          //startAlarmAtStart();
        } else if (!isRunning) {
          handleTimerStart(initialTime > 0 ? initialTime : 60); // 初期時間があればそれを、なければ1分で開始
          addButtonHistory('開始');
          playShortBeep();
          //startAlarmAtStart();
        }
        // 開始状態でEnterキーを押しても何もしない
      }
      // 以下に ArrowUp と ArrowDown のハンドリングを追加a
      else if (e.key === 'ArrowUp') { // 上矢印キー
        e.preventDefault();
        // 30秒追加
        setTotalTime(prevTotal => prevTotal + 30);
        setGenreCumulativeSeconds(prev => ({
          ...prev,
          [currentGenre]: (prev[currentGenre] || 0) + 30
        }));
        setCumulativeAdjustSeconds(prev => prev + 30); // 総調整時間を追加
        addButtonHistory('+30秒');
        playShortBeep();
        // フラッシュ効果をトリガー
        setFlashTotalTime(true);
        setFlashGenreTime(true);
        setTimeout(() => {
          setFlashTotalTime(false);
          setFlashGenreTime(false);
        }, 500); // 0.5秒後にフラッシュを解除
      }
      else if (e.key === 'ArrowDown') { // 下矢印キー
        e.preventDefault();
        
        // 実際に減算できる時間を計算（30秒または残りの時間）
        const actualSubtracted = Math.min(30, totalTime);
      
        // totalTimeを減算
        setTotalTime(prevTotal => prevTotal - actualSubtracted);
      
        // genreCumulativeSecondsを実際に減算できた分だけ減らす
        setGenreCumulativeSeconds(prev => ({
          ...prev,
          [currentGenre]: Math.max((prev[currentGenre] || 0) - actualSubtracted, 0)
        }));
      
        // cumulativeAdjustSecondsを実際に減算できた分だけ減らす
        setCumulativeAdjustSeconds(prev => prev - actualSubtracted); // 総調整時間を減少
      
        // 履歴に実際に減算した秒数を記録
        addButtonHistory(`-${actualSubtracted}秒`);
        
        // ビープ音を再生
        playShortBeep();
      
        // フラッシュ効果をトリガー
        setFlashTotalTime(true);
        setFlashGenreTime(true);
        setTimeout(() => {
          setFlashTotalTime(false);
          setFlashGenreTime(false);
        }, 500); // 0.5秒後にフラッシュを解除
      }
      // `i`キーのハンドリングを追加
      else if (e.key.toLowerCase() === 'i') { // iキー
        e.preventDefault();
        setShowPopup(true); // ポップアップを表示
        addButtonHistory('Popup表示'); // 履歴に記録
        playShortBeep(); // ビープ音を再生
      }
      // `1`キーのハンドリングを追加
      else if (e.key === '1') { // 1キー
        if (showPopup) { // ポップアップが表示されている場合のみ
          e.preventDefault();
          toggleTimerMode(); // タイマーモードをトグル
        }
      }
      // **追加部分: Escapeキーでポップアップを閉じる**
      else if (e.key === 'Escape') { // Escapeキー
        if (showPopup) {
          e.preventDefault();
          setShowPopup(false); // ポップアップを閉じる
          addButtonHistory('Popup閉じる'); // 履歴に記録
          playShortBeep(); // ビープ音を再生
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isRunning, isPaused, timeLeft, initialTime, handleTimeAdjustment, handleTimerStart, 
    playShortBeep, startAlarmAtStart, currentGenre, showPopup, toggleTimerMode,
    setCumulativeAdjustSeconds, totalTime
  ]);

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

  // 時刻を mm:ss 形式にフォーマット
  const formatTime = (seconds) => {
    const sign = seconds < 0 ? '-' : '';
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${sign} ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
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
        {/* フラッシュ効果を適用 */}
        <div className={flashTotalTime ? 'flash' : ''} >
            <TimerDisplay 
              timeLeft={timeLeft}
              totalTime={totalTime}
              sessionCount={sessionCount}
              cumulativeAdjustSeconds={cumulativeAdjustSeconds} // 追加
              formatTime={formatTime} // 追加
            />
        </div>

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
        {/* フラッシュ効果を適用 */}
        <div className={flashGenreTime ? 'flash' : ''}>
          <TimeProgressClock 
            activeMinutes={activeTimeMinutes}
            isRunning={isRunning}
            isPaused={isPaused}
            genreColors={genreColors}
            currentGenre={currentGenre}
            timeLeft={timeLeft}
            currentGenreCumulativeSeconds={genreCumulativeSeconds[currentGenre] || 0}
            startAlarmAtMinus={startAlarmAtMinus}
            playShortBeep={playShortBeep}
          />
        </div>
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
