import { useEffect, useRef } from 'react';
import { HostRoomView } from '../../types';
import { audio } from '../../audio';
import { t } from '../../texts';

// Splash screen before the first question of a category.
export function HostCategory({ view, onNext }: { view: HostRoomView; onNext: () => void }) {
  const category = view.category!;

  return (
    <div className="page">
      <div className="category-splash">
        {category.videoUrl ? (
          <SplashVideo src={category.videoUrl} />
        ) : category.imageUrl ? (
          <img className="category-splash-image" src={category.imageUrl} alt="" />
        ) : (
          <div className="category-splash-image placeholder">{category.emoji}</div>
        )}
        <h1 className="title category-splash-title">{category.title}</h1>
      </div>
      <button className="btn btn-primary btn-lg" onClick={onNext}>
        {t('host.category.next')}
      </button>
    </div>
  );
}

// Autoplays with sound, unless the host muted the game or the browser won't
// allow sound -- then it plays silently.
function SplashVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = audio.isMuted();
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });
  }, []);

  return <video ref={ref} className="category-splash-image video" src={src} playsInline />;
}
