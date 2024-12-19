// src/hooks/useGenreData.js

const { useState, useEffect } = React;

// カスタムフック：ジャンルデータの取得
const useGenreData = () => {
  const [genreData, setGenreData] = useState({
    genres: ["YouTube", "映画", "勉強", "その他"],
    genreColors: {
      "YouTube": 'rgba(255, 99, 132, 0.5)', // 赤系
      "映画": 'rgba(54, 162, 235, 0.5)',     // 青系
      "勉強": 'rgba(75, 192, 192, 0.5)',     // 緑系
      "その他": 'rgba(255, 206, 86, 0.5)',    // 黄系
    }
  });

  useEffect(() => {
    const fetchGenreData = async () => {
      try {
        const response = await fetch('https://api.jsonbin.io/v3/b/675817bae41b4d34e462efc7', {
          headers: {
            'X-Access-Key': '$2a$10$j78Z7WmZQp31CuNIxqgt4uNiew0nO/LyxSdvnvLSlCijuNBIYtcEa'
          }
        });
        const data = await response.json();
        setGenreData(data.record);
      } catch (error) {
        console.error('ジャンルデータの取得エラー:', error);
      }
    };

    fetchGenreData();
  }, []);

  return genreData;
};
