// src/main.js
const { createSlice, configureStore } = window.RTK;
const { Provider } = window.ReactRedux;

// Timer Slice
const timerSlice = createSlice({
  name: 'timer',
  initialState: {
    activeMinutes: [],
    isRunning: false,
    isPaused: false,
    timeLeft: 3600, // 1時間
    currentGenre: 'YouTube',
    genreCumulativeSeconds: {
      YouTube: 3600,
      映画: 1800,
      勉強: 600,
      その他: 900,
    },
    isBlinking: true,
  },
  reducers: {
    setActiveMinutes: (state, action) => {
      state.activeMinutes = action.payload;
    },
    addActiveMinute: (state, action) => {
      state.activeMinutes.push(action.payload);
    },
    setIsRunning: (state, action) => {
      state.isRunning = action.payload;
    },
    setIsPaused: (state, action) => {
      state.isPaused = action.payload;
    },
    setTimeLeft: (state, action) => {
      state.timeLeft = action.payload;
    },
    setCurrentGenre: (state, action) => {
      state.currentGenre = action.payload;
    },
    setGenreCumulativeSeconds: (state, action) => {
      state.genreCumulativeSeconds = action.payload;
    },
    toggleBlinking: (state) => {
      state.isBlinking = !state.isBlinking;
    },
  },
});

const {
  setActiveMinutes,
  addActiveMinute,
  setIsRunning,
  setIsPaused,
  setTimeLeft,
  setCurrentGenre,
  setGenreCumulativeSeconds,
  toggleBlinking,
} = timerSlice.actions;

// ローカルストレージから保存された位置を読み込む関数
const getStoredAlarmPosition = (alarmId) => {
  const stored = localStorage.getItem(alarmId);
  console.log('stored', stored);
  console.log('alarmId', alarmId);
  return stored ? JSON.parse(stored) : null;
};

// Alarm Slice
const alarmSlice = createSlice({
  name: 'alarm',
  initialState: {
    alarms: [
      {
        id: 'alarm1',
        ...getStoredAlarmPosition('alarm1') || { x: 300, y: -5 ,time: '--:--'},  // デフォルト値は元の値を使用
        isOn: false,
        triggeredTime: null,
        didCancel: false
      },
      {
        id: 'alarm2',
        ...getStoredAlarmPosition('alarm2') || { x: 335, y: -5 ,time: '--:--'},  // デフォルト値は元の値を使用
        isOn: false,
        triggeredTime: null,
        didCancel: false
      },
    ],
    draggingAlarmIndex: null,
  },
  reducers: {
    setAlarms: (state, action) => {
      state.alarms = action.payload;
    },
    updateAlarm: (state, action) => {
      const { index, newData } = action.payload;
      if (state.alarms[index]) {
        state.alarms[index] = { ...state.alarms[index], ...newData };
      }
    },
    setDraggingAlarmIndex: (state, action) => {
      state.draggingAlarmIndex = action.payload;
    },
    updateAlarmPosition: (state, action) => {
      const { id, x, y } = action.payload;
      const alarm = state.alarms.find(a => a.id === id);
      if (alarm) {
        alarm.x = x;
        alarm.y = y;
        // ローカルストレージに保存
        localStorage.setItem(id, JSON.stringify({ x, y }));
      }
    },
  },
});

const { setAlarms, updateAlarm, setDraggingAlarmIndex } = alarmSlice.actions;

// Expose Alarm Actions Globally
window.alarmActions = { setAlarms, updateAlarm, setDraggingAlarmIndex };

// Images Slice
const imagesSlice = createSlice({
  name: 'images',
  initialState: {
    imagesLoaded: { red: false, blue: false },
  },
  reducers: {
    setImagesLoaded: (state, action) => {
      state.imagesLoaded = action.payload;
    },
  },
});

const { setImagesLoaded } = imagesSlice.actions;

// Storeの設定
const store = configureStore({
  reducer: {
    timer: timerSlice.reducer,
    alarm: alarmSlice.reducer,
    images: imagesSlice.reducer,
  },
});

// アプリケーションをProviderでラップしてレンダリング
ReactDOM.render(
  <Provider store={store}>
    <CountdownTimer />
  </Provider>,
  document.getElementById('root')
);

