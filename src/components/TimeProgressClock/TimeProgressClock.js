// src/components/TimeProgressClock/TimeProgressClock.js
const { useRef, useState, useEffect } = React;
const { useSelector, useDispatch } = window.ReactRedux;

// TimeProgressClock コンポーネント：キャンバスに時間進行状況を描画
const TimeProgressClock = ({
  activeMinutes,
  isRunning,
  isPaused,
  genreColors,
  currentGenre,
  timeLeft,
  currentGenreCumulativeSeconds
}) => {
  const canvasRef = useRef(null);
  const dispatch = useDispatch();

  // 現在時刻
  const [now, setNow] = useState(new Date());
  const [isBlinking, setIsBlinking] = useState(true);

  // Redux State: alarms and draggingAlarmIndex
  const alarms = useSelector((state) => state.alarm.alarms);
  const draggingAlarmIndex = useSelector((state) => state.alarm.draggingAlarmIndex);

  // ドラッグ計測用の参照
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // 現在時刻を1秒ごとに更新
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 点滅制御（ジャンルアイコンの点滅用）
  useEffect(() => {
    let blinkInterval;
    if (isRunning && !isPaused) {
      blinkInterval = setInterval(() => {
        setIsBlinking((prev) => !prev);
      }, 500);
    }
    return () => clearInterval(blinkInterval);
  }, [isRunning, isPaused]);

  // ★ アラームの時刻に達したかどうかチェック ⇒ 到達時に isOn = true, triggeredTime をセット
  useEffect(() => {
    const formattedNowTime = getCurrent12HourTime(now);
    const currentSec = now.getSeconds();
    
    // Get current alarms from Redux and update them
    const updatedAlarms = alarms.map((alarm) => {
      // 既に鳴動中ならスキップ（5分経過まで継続）
      if (alarm.isOn) return alarm;
      // '--:--' や '' は無視
      if (!alarm.time || alarm.time === '--:--') return alarm;

      // アラーム時刻と一致かつ、秒が 0~2 の間だけトリガー
      if (
        alarm.time === formattedNowTime &&
        currentSec >= 0 && currentSec <= 2
      ) {
        return {
          ...alarm,
          isOn: true,
          triggeredTime: Date.now(), // タイムスタンプに変更
          didCancel: false
        };
      }
      return alarm;
    });

    // Dispatch the updated alarms to Redux
    dispatch(window.alarmActions.setAlarms(updatedAlarms));
  }, [now, alarms, dispatch]);

  // ★ 鳴動開始後、5分（300秒）経過したら自動オフ
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const updatedAlarms = alarms.map((alarm) => {
        if (!alarm.isOn || !alarm.triggeredTime) return alarm;

        const elapsed = (Date.now() - alarm.triggeredTime) / 1000; // 経過秒
        if (elapsed >= 300) {
          // 5分経ったらオフにする
          return { ...alarm, isOn: false, triggeredTime: null, didCancel: false };
        }
        return alarm;
      });

      // Dispatch the updated alarms to Redux
      dispatch(window.alarmActions.setAlarms(updatedAlarms));
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [alarms, dispatch]);

  // --- ビープ音再生関数 ---
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

  // ビープ音が最後に再生された秒数を記録
  const lastBeepSecond = useRef(null);

  // ユーティリティ関数：次の分に進んでいるか判定 (11:59 -> 12:00 のまたぎにも対応)
  const isNextMinute = (time1, time2) => {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    if ((h1 === 11 && m1 === 59) && (h2 === 12 && m2 === 0)) {
      return true;
    }
    const total1 = (h1 % 12) * 60 + m1;
    const total2 = (h2 % 12) * 60 + m2;
    return (total2 - total1) === 1;
  };

  // 12時間形式に変換する関数
  const getCurrent12HourTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    hours = hours % 12 || 12; // 0時は12時として扱う
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // 12時間形式 "HH:MM" をパースして {hour, minute} を返す
  const parseTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') {
      const now = new Date();
      return { hour: now.getHours() % 12 || 12, minute: now.getMinutes() };
    }
    const parts = timeStr.split(':');
    if (parts.length !== 2) {
      const now = new Date();
      return { hour: now.getHours() % 12 || 12, minute: now.getMinutes() };
    }
    let [H, M] = parts.map(Number);
    if (isNaN(H) || isNaN(M)) {
      const now = new Date();
      return { hour: now.getHours() % 12 || 12, minute: now.getMinutes() };
    }
    return { hour: H, minute: M };
  };

  // 時刻を角度に変換（12時間形式を想定）
  const timeToAngle = (hour, minute) => {
    const totalMinutes = (hour % 12) * 60 + minute;
    const ratio = totalMinutes / (12 * 60);
    return ratio * 2 * Math.PI - Math.PI / 2;
  };

  // 秒を mm:ss 形式にフォーマット
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // アラームアイコン (x, y) から時刻を計算し "HH:MM" を返す。内円や右上隅なら '' を返す。
  const formatAlarmTime = (x, y, centerX, centerY, outerRadius, midRadius, innerRadius) => {
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 内円より小さい or 右上隅なら時刻を表示しない
    if (distance < innerRadius || (x > 290 && y <= 25)) {
      return '';
    }

    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;

    const totalMinutes = Math.floor((angle / (2 * Math.PI)) * (12 * 60));
    let hour = Math.floor(totalMinutes / 60) % 12 || 12;
    const minute = totalMinutes % 60;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  // ドラッグ開始時：どのアラームを掴んだかを判定
  const handleDragStart = (mouseX, mouseY) => {
    for (let i = 0; i < alarms.length; i++) {
      const alarm = alarms[i];
      const distance = Math.sqrt((mouseX - alarm.x) ** 2 + (mouseY - alarm.y) ** 2);
      // 上部にあるアラームはクリック判定を広めにする
      const clickRange = alarm.y <= 0 ? 30 : 15;

      if (distance < clickRange) {
        dispatch(window.alarmActions.setDraggingAlarmIndex(i));
        dragStartPos.current = { x: mouseX, y: mouseY };
        hasDragged.current = false;
        break;
      }
    }
  };

  // ドラッグ中：該当のアラームの位置(x,y) と time を更新
  const handleDragMove = (mouseX, mouseY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(centerX, centerY) - 30;
    const midRadius = outerRadius * 0.75;
    const innerRadius = midRadius * 0.6;

    // ドラッグが一定距離以上移動したらドラッグとみなす
    if (!hasDragged.current) {
      const dx = mouseX - dragStartPos.current.x;
      const dy = mouseY - dragStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 5) {
        hasDragged.current = true;
      }
    }

    // キャンバス境界に収まるように補正
    const margin = 14;
    const newX = Math.max(margin, Math.min(mouseX, width - margin));
    const newY = Math.max(-5, Math.min(mouseY, height - margin));

    // 新しい座標に対応する時刻を計算
    const updatedTime = formatAlarmTime(newX, newY, centerX, centerY, outerRadius, midRadius, innerRadius);

    // alarms の該当要素だけ更新
    const updatedAlarms = alarms.map((alarm, i) => {
      if (i === draggingAlarmIndex) {
        return { ...alarm, x: newX, y: newY, time: updatedTime };
      }
      return alarm;
    });

    // Dispatch the updated alarms to Redux
    dispatch(window.alarmActions.setAlarms(updatedAlarms));
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    dispatch(window.alarmActions.setDraggingAlarmIndex(null));
    // ドラッグが発生していない場合のみ「キャンセルフラグ」をどう扱うか
    // → 今回は「ドラッグなしでクリックした場合はアラームを即オフにする」等に使うならここでロジックを書く
  };

  // --- マウスイベント ---
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    handleDragStart(mouseX, mouseY);
  };

  const handleMouseMove = (e) => {
    if (draggingAlarmIndex === null) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    handleDragMove(mouseX, mouseY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // --- タッチイベント（シングルタッチのみドラッグ対応） ---
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      handleDragStart(touchX, touchY);
      e.preventDefault(); // シングルタッチ時は preventDefault でスクロール等を無効化
    }
    // マルチタッチは何もしない
  };

  const handleTouchMove = (e) => {
    if (draggingAlarmIndex !== null && e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      handleDragMove(touchX, touchY);
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e) => {
    // シングルタッチが離れた場合のみドラッグ終了
    if (draggingAlarmIndex !== null && e.touches.length === 0) {
      handleDragEnd();
      e.preventDefault();
    }
  };

  // イベントリスナーの登録・解除
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // マウスイベント
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // タッチイベント
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggingAlarmIndex]);

  // キャンバスをクリックしたらアラームをキャンセル（ドラッグなしクリック時）
  const handleCanvasClick = () => {
    if (!hasDragged.current) {
      // 鳴動中のアラームがあればキャンセル
      const updatedAlarms = alarms.map((alarm) => {
        if (alarm.isOn) {
          return { ...alarm, isOn: false, didCancel: true, triggeredTime: null };
        }
        return alarm;
      });
      dispatch(window.alarmActions.setAlarms(updatedAlarms));
    }
    hasDragged.current = false;
  };

  // 画像の事前読み込みとキャッシュ
  const redBellImage = useRef(new Image());
  const blueBellImage = useRef(new Image());
  const [imagesLoaded, setImagesLoaded] = useState({ red: false, blue: false });

  // SVGデータURLの作成関数
  const createBellIconBase64 = (color) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <path d="M12 1.5 C10 1.5 8.5 3 8.5 5
                 C8.5 5.5 8.6 6 8.8 6.4
                 C6.5 7.4 5 9.8 5 12.5
                 L5 16.5
                 C5 17.5 4.5 18.5 3.5 19
                 L3 19.5
                 L21 19.5
                 L20.5 19
                 C19.5 18.5 19 17.5 19 16.5
                 L19 12.5
                 C19 9.8 17.5 7.4 15.2 6.4
                 C15.4 6 15.5 5.5 15.5 5
                 C15.5 3 14 1.5 12 1.5 Z
                 M10 20
                 C10 21.7 10.9 22.5 12 22.5
                 C13.1 22.5 14 21.7 14 20
                 L10 20 Z"
              fill="${color}" stroke="white" stroke-width="2.5"/>
          <path d="M12 1.5 C10 1.5 8.5 3 8.5 5
                 C8.5 5.5 8.6 6 8.8 6.4
                 C6.5 7.4 5 9.8 5 12.5
                 L5 16.5
                 C5 17.5 4.5 18.5 3.5 19
                 L3 19.5
                 L21 19.5
                 L20.5 19
                 C19.5 18.5 19 17.5 19 16.5
                 L19 12.5
                 C19 9.8 17.5 7.4 15.2 6.4
                 C15.4 6 15.5 5.5 15.5 5
                 C15.5 3 14 1.5 12 1.5 Z
                 M10 20
                 C10 21.7 10.9 22.5 12 22.5
                 C13.1 22.5 14 21.7 14 20
                 L10 20 Z"
              fill="${color}" stroke="black" stroke-width="0.5"/>
      </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // 画像のロード処理
  useEffect(() => {
    let isMounted = true;
    const redIcon = createBellIconBase64('#ff0000');
    const blueIcon = createBellIconBase64('#0000ff');

    const handleRedLoad = () => {
      if (isMounted) {
        setImagesLoaded((prev) => ({ ...prev, red: true }));
      }
    };
    const handleBlueLoad = () => {
      if (isMounted) {
        setImagesLoaded((prev) => ({ ...prev, blue: true }));
      }
    };

    redBellImage.current.src = redIcon;
    redBellImage.current.onload = handleRedLoad;

    blueBellImage.current.src = blueIcon;
    blueBellImage.current.onload = handleBlueLoad;

    return () => {
      isMounted = false;
      redBellImage.current.onload = null;
      blueBellImage.current.onload = null;
    };
  }, []);

  // キャンバス描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;

    const outerRadius = Math.min(centerX, centerY) - 30;
    const midRadius = outerRadius * 0.75;
    const innerRadius = midRadius * 0.6;

    ctx.clearRect(0, 0, width, height);

    // 右上隅にアラーム除外エリア
    const boxWidthTrianglePark = 60;
    ctx.shadowColor = 'rgba(120, 120, 120, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#eeeeee';
    ctx.fillRect(width - boxWidthTrianglePark, 0, boxWidthTrianglePark, 10);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 外周に数字（1~12）を描画
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#333';
    for (let num = 1; num <= 12; num++) {
      const angle = (num / 12) * 2 * Math.PI - Math.PI / 2;
      const r = outerRadius + 20;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      ctx.fillText(num.toString(), x, y);
    }

    // 外円
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 中円
    ctx.beginPath();
    ctx.arc(centerX, centerY, midRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 内円
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 現在時刻の小さな三角形（時針）
    const drawCurrentTimeTriangle = (ctx, centerX, centerY, outerRadius) => {
      const triangleHeight = 6;
      const triangleWidth = 20;
      const nowDate = new Date();
      const hours = nowDate.getHours() % 12;
      const minutes = nowDate.getMinutes();
      const seconds = nowDate.getSeconds();
      const totalHours = hours + minutes / 60 + seconds / 3600;
      const angle = (totalHours / 12) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + (outerRadius + 6) * Math.cos(angle);
      const y = centerY + (outerRadius + 6) * Math.sin(angle);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);

      ctx.beginPath();
      ctx.moveTo(0, triangleHeight);
      ctx.lineTo(-triangleWidth / 2, -triangleHeight);
      ctx.lineTo(triangleWidth / 2, -triangleHeight);
      ctx.closePath();
      ctx.fillStyle = 'gray';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };
    drawCurrentTimeTriangle(ctx, centerX, centerY, outerRadius);

    // 現在時刻の小さな三角形（分針）
    const drawCurrentTimeMinuteTriangle = (ctx, centerX, centerY, outerRadius) => {
      const triangleHeight = 3;
      const triangleWidth = 10;
      const nowDate = new Date();
      const hours = nowDate.getHours() % 12;
      const minutes = nowDate.getMinutes();
      const seconds = nowDate.getSeconds();
      const totalHours = hours + minutes / 60 + seconds / 3600;
      const totalMinutes = totalHours * 60;
      const angle = (totalMinutes / 60) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + (outerRadius + 15) * Math.cos(angle);
      const y = centerY + (outerRadius + 15) * Math.sin(angle);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);

      ctx.beginPath();
      ctx.moveTo(0, triangleHeight);
      ctx.lineTo(-triangleWidth / 2, -triangleHeight);
      ctx.lineTo(triangleWidth / 2, -triangleHeight);
      ctx.closePath();
      ctx.fillStyle = 'gray';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };
    drawCurrentTimeMinuteTriangle(ctx, centerX, centerY, outerRadius);

    // activeMinutes をジャンル別にグループ化
    const groupedMinutes = activeMinutes.reduce((acc, entry) => {
      const { time, genre } = entry;
      const { hour, minute } = parseTime(time);
      const timeKey = `${hour}:${minute}`;
      const lastGroup = acc[acc.length - 1];

      if (lastGroup && lastGroup.genre === genre && isNextMinute(lastGroup.lastTime, timeKey)) {
        lastGroup.times.push(timeKey);
        lastGroup.lastTime = timeKey;
      } else {
        acc.push({
          genre,
          times: [timeKey],
          lastTime: timeKey
        });
      }
      return acc;
    }, []);

    // 塗りつぶし描画
    const anglePerMinute = (2 * Math.PI) / (12 * 60);
    const currentTimeKey24 = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    groupedMinutes.forEach((group) => {
      const { genre, times } = group;
      const fillColor = genreColors[genre] || 'rgba(96, 165, 250, 0.5)';
      const startTime = parseTime(times[0]);
      const endTime = parseTime(times[times.length - 1]);
      const startAngle = timeToAngle(startTime.hour, startTime.minute);
      const endAngle = timeToAngle(endTime.hour, endTime.minute) + anglePerMinute;
      const isOuterTime = startTime.hour >= 6 && startTime.hour < 18;
      const drawRadius = isOuterTime ? outerRadius : midRadius;
      const baseRadius = isOuterTime ? midRadius : innerRadius;

      ctx.beginPath();
      ctx.arc(centerX, centerY, drawRadius, startAngle, endAngle);
      ctx.lineTo(
        centerX + baseRadius * Math.cos(endAngle),
        centerY + baseRadius * Math.sin(endAngle)
      );
      ctx.arc(centerX, centerY, baseRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      // カレントジャンルの点滅ドット
      if (isRunning && !isPaused && genre === currentGenre && times.includes(currentTimeKey24)) {
        const currentAngle = timeToAngle(now.getHours() % 12 || 12, now.getMinutes());
        const dotRadius = 6;
        ctx.beginPath();
        ctx.arc(
          centerX + (isOuterTime ? outerRadius : midRadius) * Math.cos(currentAngle),
          centerY + (isOuterTime ? outerRadius : midRadius) * Math.sin(currentAngle),
          dotRadius,
          0,
          2 * Math.PI
        );

        if (isBlinking) {
          ctx.fillStyle = genreColors[currentGenre]?.replace('0.5', '0.3') || '#666';
          ctx.fill();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = genreColors[currentGenre]?.replace('0.5', '0.3') || '#666';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    });

    // ベルアイコンを描画する関数
    const drawBellIcon = (ctx, x, y, img, alarm) => {
      if (!img) return;
      if (!imagesLoaded.red && alarm.id === 'alarm1') return;
      if (!imagesLoaded.blue && alarm.id === 'alarm2') return;

      ctx.save();
      const scaleActive = (alarm.isOn && !alarm.didCancel && now.getSeconds() % 2 === 0);
      const scale = scaleActive ? 1.2 : 1; // 拡大率 (Adjusted for better scaling)
      const size = 24 * scale;

      // ビープ音を一度だけ再生するためのチェック
      if (alarm.isOn && !alarm.didCancel && scaleActive) {
        const currentSecond = now.getSeconds();
        if (lastBeepSecond.current !== currentSecond) {
          playShortBeep();
          lastBeepSecond.current = currentSecond;
        }
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // 画像描画位置の補正
      const tmpDrawX = x - size / 2;
      const tmpDrawY = y - size / 2;
      const drawX = (tmpDrawX + size > width) ? width - size : (tmpDrawX < 0 ? 0 : tmpDrawX);
      const drawY = (tmpDrawY + size > height) ? height - size : (tmpDrawY < 0 ? 0 : tmpDrawY);
      ctx.drawImage(img, drawX, drawY, size, size);

      ctx.restore();
    };

    // alarms 配列の各アラームアイコンを描画
    alarms.forEach((alarm) => {
      const img = alarm.id === 'alarm1' ? redBellImage.current : blueBellImage.current;
      drawBellIcon(ctx, alarm.x, alarm.y, img, alarm);
    });

    // 中央に累積時間を表示
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const formattedGenreTime = formatTime(currentGenreCumulativeSeconds);
    const genreColor = genreColors[currentGenre] || '#333333';
    ctx.shadowColor = 'rgba(20, 20, 20, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = genreColor;
    ctx.fillText(formattedGenreTime, centerX, centerY - 5);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // アラーム時刻をテキスト表示
    ctx.font = 'bold 16px Arial';
    alarms.forEach((alarm) => {
      // 位置の少し上にテキスト（time）を描画
      if (alarm.id === 'alarm1') {
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'white';
        ctx.strokeText(`${alarm.time}`, alarm.x, alarm.y - 20);
        ctx.fillStyle = 'red';
        ctx.fillText(`${alarm.time}`, alarm.x, alarm.y - 20);
      } else {
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'white';
        ctx.strokeText(`${alarm.time}`, alarm.x, alarm.y - 20);
        ctx.fillStyle = 'blue';
        ctx.fillText(`${alarm.time}`, alarm.x, alarm.y - 20);
      }
    });
  }, [
    activeMinutes,
    isRunning,
    isPaused,
    genreColors,
    isBlinking,
    currentGenre,
    timeLeft,
    currentGenreCumulativeSeconds,
    alarms,            // alarms の変更に応じて再描画
    now,
    imagesLoaded
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={350}
      height={350}
      onClick={handleCanvasClick}
      style={{ cursor: 'pointer' }}
    />
  );
};

// CountdownTimer コンポーネント：TimeProgressClock を利用
const CountdownTimer = () => {
  const [activeMinutes, setActiveMinutes] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600); // 例: 1時間
  const [currentGenre, setCurrentGenre] = useState('YouTube');
  const genreColors = {
    'YouTube': 'rgba(255, 99, 132, 0.5)', // 赤
    '映画': 'rgba(54, 162, 235, 0.5)',    // 青
    '勉強': 'rgba(255, 206, 86, 0.5)',   // 黄
    'その他': 'rgba(75, 192, 192, 0.5)', // 緑
  };
  const [genreCumulativeSeconds, setGenreCumulativeSeconds] = useState({
    'YouTube': 3600,
    '映画': 1800,
    '勉強': 600,
    'その他': 900,
  });

  // 毎分0秒ごとに現在ジャンルの打刻を activeMinutes に追加（ダミー更新の例）
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const formattedTime = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (now.getSeconds() === 0) {
        setActiveMinutes((prev) => [...prev, { time: formattedTime, genre: currentGenre }]);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentGenre]);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl mb-4">Countdown Timer</h1>
      <TimeProgressClock
        activeMinutes={activeMinutes}
        isRunning={isRunning}
        isPaused={isPaused}
        genreColors={genreColors}
        currentGenre={currentGenre}
        timeLeft={timeLeft}
        currentGenreCumulativeSeconds={genreCumulativeSeconds[currentGenre] || 0}
      />
      <div className="mt-4">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="px-4 py-2 bg-yellow-500 text-white rounded"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <div className="mt-4">
        <label className="mr-2">Genre:</label>
        <select
          value={currentGenre}
          onChange={(e) => setCurrentGenre(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          {Object.keys(genreColors).map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

// ReactDOMを使用してCountdownTimerをレンダリング
ReactDOM.render(
  React.createElement(CountdownTimer),
  document.getElementById('root')
);
