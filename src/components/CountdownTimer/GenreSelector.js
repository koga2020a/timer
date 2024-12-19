// src/components/CountdownTimer/GenreSelector.js

const GenreSelector = ({ genres, genreColors, currentGenre, setCurrentGenreIndex, playShortBeep }) => {
  useEffect(() => {
    console.log('GenreSelector - currentGenre:', currentGenre);
  }, [currentGenre]);

  return (
    <div className="flex gap-3 mt-6">
      {genres.map((genre, index) => (
        <button
          key={genre}
          onClick={(e) => {
            e.stopPropagation();
            playShortBeep();
            setCurrentGenreIndex(index);
          }}
          className={`px-5 py-2 rounded-lg transition-all duration-100 border relative
            before:absolute before:inset-0 before:rounded-lg before:transition-opacity before:duration-100
            active:translate-y-1 active:shadow-[0_0px_0_0] ${
            currentGenre === genre
              ? 'translate-y-1 shadow-[0_0px_0_0] font-medium'
              : 'shadow-[0_4px_0_0] font-normal hover:translate-y-0.5 hover:shadow-[0_2px_0_0]'
          }`}
          style={{
            backgroundColor: genreColors[genre]?.replace('0.5', currentGenre === genre ? '0.7' : '0.5'),
            borderColor: genreColors[genre]?.replace('0.5', '0.8'),
            color: '#ffffff',
            textShadow: '1px 1px 1px rgba(0,0,0,0.2)',
            boxShadow: `0 ${currentGenre === genre ? '0' : '4'}px 0 0 ${genreColors[genre]?.replace('0.5', '0.8')}`,
          }}>
          {genre}
        </button>
      ))}
    </div>
  );
};
