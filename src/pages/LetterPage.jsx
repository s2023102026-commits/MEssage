import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PinScreen from '../components/PinScreen';
import EnvelopeScreen from '../components/EnvelopeScreen';
import LetterScreen from '../components/LetterScreen';
import VideoMessageScreen from '../components/VideoMessageScreen';

/** Seconds of audio kept at the end of the track for the farewell → airplane scene (any track length). */
const FINALE_MUSIC_TAIL_SEC = 74;
const DEFAULT_VIDEO_URL = 'https://drive.google.com/file/d/1xV_Gy434ntNSbnf5MELIHLJiGXXiMJRP/view?usp=sharing';

const LetterPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  
  // State Machine: loading -> locked -> envelope -> reading -> video
  const [phase, setPhase] = useState('loading');

  // Music player state - lives here so it persists across LetterScreen -> VideoMessageScreen
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicReady, setMusicReady] = useState(false);
  const playerRef = useRef(null);
  /** When false, finale segment plays once and stays ended (matches 2:59 / “Safe travels” beat). */
  const shouldLoopMusicRef = useRef(true);

  useEffect(() => {
    const dataHash = searchParams.get('data');
    if (!dataHash) {
      setError('No secret letter found in this link.');
      return;
    }

    try {
      const jsonString = decodeURIComponent(escape(atob(dataHash)));
      const parsedData = JSON.parse(jsonString);
      if (!parsedData.pin || !parsedData.message) {
        throw new Error('Invalid letter data');
      }
      setConfig({
        ...parsedData,
        videoUrl: parsedData.videoUrl || DEFAULT_VIDEO_URL,
      });
    } catch (err) {
      console.error(err);
      setError('This link appears to be invalid or broken.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (config && !error) {
       const loadTimer = setTimeout(() => {
           setPhase('locked');
       }, 2500);
       return () => clearTimeout(loadTimer);
    }
  }, [config, error]);

  // Extract YouTube ID from config
  let youtubeId = null;
  if (config && config.musicLink) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = config.musicLink.match(regExp);
    if (match && match[2].length === 11) {
      youtubeId = match[2];
    }
  }

  // Initialize YouTube player when entering 'reading' phase
  useEffect(() => {
    if (phase !== 'reading' || !youtubeId) return;
    if (musicReady) return; // Already initialized

    const loadYTApi = () => {
      return new Promise((resolve) => {
        if (window.YT && window.YT.Player) {
          resolve();
          return;
        }
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript.parentNode.insertBefore(tag, firstScript);
        window.onYouTubeIframeAPIReady = () => resolve();
      });
    };

    loadYTApi().then(() => {
      setTimeout(() => {
        if (playerRef.current) {
          try { playerRef.current.destroy(); } catch(e) {}
        }
        playerRef.current = new window.YT.Player('yt-persistent-player', {
          height: '1',
          width: '1',
          videoId: youtubeId,
          playerVars: {
            autoplay: 1,
            // Loop is handled in onStateChange so we can disable it for the finale (natural end ~2:59).
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              shouldLoopMusicRef.current = true;
              event.target.setVolume(80);
              event.target.playVideo();
              setIsPlaying(true);
              setMusicReady(true);
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED && shouldLoopMusicRef.current) {
                event.target.playVideo();
              }
            },
          },
        });
      }, 300);
    });

    return () => {
      // Don't destroy on cleanup - we want it to persist
    };
  }, [phase, youtubeId, musicReady]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => {
      const next = !prev;
      if (playerRef.current) {
        try {
          if (next) {
            playerRef.current.playVideo();
          } else {
            playerRef.current.pauseVideo();
          }
        } catch (e) {}
      }
      return next;
    });
  }, []);

  // Dim music volume (called when video call starts — music becomes soft background)
  const dimMusic = useCallback(() => {
    if (playerRef.current) {
      try {
        // Smoothly fade volume from current level down to 12 (out of 100)
        const currentVol = playerRef.current.getVolume() || 80;
        const targetVol = 12;
        const steps = 20;
        const stepTime = 100; // 2 seconds total fade
        let step = 0;
        const fadeInterval = setInterval(() => {
          step++;
          const newVol = Math.round(currentVol - (currentVol - targetVol) * (step / steps));
          try {
            playerRef.current.setVolume(newVol);
          } catch(e) {}
          if (step >= steps) clearInterval(fadeInterval);
        }, stepTime);
      } catch (e) {}
    }
  }, []);

  // Restart music for the finale (called when video ends / hang up).
  // Uses the last FINALE_MUSIC_TAIL_SEC of the video so shorter tracks still cover terminal + departure.
  const restartMusicForFinale = useCallback(() => {
    if (playerRef.current) {
      try {
        shouldLoopMusicRef.current = false;
        let seekSec = 121;
        const dur = playerRef.current.getDuration?.();
        if (typeof dur === 'number' && dur > 0 && Number.isFinite(dur)) {
          seekSec = Math.max(0, dur - FINALE_MUSIC_TAIL_SEC);
        }
        playerRef.current.seekTo(seekSec, true);
        playerRef.current.playVideo();
        setIsPlaying(true);

        // Smoothly fade volume back up from 12% to 75% over 3 seconds
        const startVol = 12;
        const targetVol = 75;
        const steps = 30;
        const stepTime = 100; // 3 seconds total
        let step = 0;
        const fadeInterval = setInterval(() => {
          step++;
          const newVol = Math.round(startVol + (targetVol - startVol) * (step / steps));
          try {
            playerRef.current.setVolume(newVol);
          } catch(e) {}
          if (step >= steps) clearInterval(fadeInterval);
        }, stepTime);
      } catch (e) {}
    }
  }, []);

  if (error) {
    return (
      <div className="flex-center animate-fade-in" style={{ minHeight: '100vh', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: 'var(--error)', marginBottom: '1rem' }}>Oops!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Create your own letter
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Persistent YouTube player - lives outside of any phase so it doesn't unmount */}
      {youtubeId && (phase === 'reading' || phase === 'video') && (
        <div style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px', overflow: 'hidden', zIndex: -100 }}>
          <div id="yt-persistent-player"></div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', background: '#111' }}>
          <div className="animate-heartbeat" style={{ marginBottom: '1rem' }}>
             <img src="/loading_icon.png" alt="Loading Envelope" style={{ width: '110px', height: 'auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <p style={{ color: 'white', letterSpacing: '4px', fontSize: '0.8rem', opacity: 0.8 }}>
            LOADING YOUR PAGE...
          </p>
        </div>
      )}

      {phase === 'locked' && (
        <PinScreen 
          correctPin={config.pin} 
          onUnlock={() => setPhase('envelope')} 
        />
      )}

      {phase === 'envelope' && (
        <EnvelopeScreen 
          onOpenComplete={() => setPhase('reading')}
        />
      )}

      {phase === 'reading' && (
        <>
            <LetterScreen 
               config={config} 
               onFinish={() => setPhase('video')}
               isPlaying={isPlaying}
               togglePlayPause={togglePlayPause}
            />
        </>
      )}

      {phase === 'video' && (
         <VideoMessageScreen videoUrl={config.videoUrl} dimMusic={dimMusic} restartMusicForFinale={restartMusicForFinale} />
      )}
    </>
  );
};

export default LetterPage;
