import React, { useState, useRef, useEffect } from 'react';
import { Phone, PhoneOff, MicOff, Video } from 'lucide-react';

/** Pilot's Log lines (dual terminal — must match typing effect below exactly). */
const PILOTS_FINAL_MESSAGE = [
  '> SYSTEM.LOG // FINAL ENTRY',
  '> DATE: 2026-05-04',
  '> STATUS: BUILD COMPLETE',
  '>',
  '> ...',
  '>',
  "> I've debugged a thousand errors,",
  '> compiled countless lines of code,',
  '> and searched through every',
  '> stack trace...',
  '>',
  '> But no algorithm could ever',
  '> explain why my heart runs',
  '> an infinite loop for you.',
  '>',
  '> You are my favorite exception',
  "> the one bug I never",
  '> want to fix.',
  '>',
  '> I love you so much.',
  '> Thank you for everything.',
  '>',
  '> return "forever yours";',
  '> // - Kurt',
];

function countTypingTicks(messages) {
  let ticks = 0;
  let lineIndex = 0;
  let charIndex = 0;
  while (lineIndex < messages.length) {
    const line = messages[lineIndex];
    if (charIndex <= line.length) {
      ticks++;
      charIndex++;
    } else {
      lineIndex++;
      charIndex = 0;
      ticks++;
    }
  }
  return ticks;
}

const PILOT_LOG_MS_PER_TICK = 60;
const PILOT_LOG_TYPING_DELAY_MS = 3000;
const ASCII_DECRYPT_MS = 1500 + 800;
const PILOTS_LOG_TYPING_MS =
  PILOT_LOG_TYPING_DELAY_MS +
  PILOT_LOG_MS_PER_TICK * countTypingTicks(PILOTS_FINAL_MESSAGE);

const getGoogleDriveFileId = (url) => {
  if (!url) return null;
  const match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (!match) return null;
  return match[1];
};

const VideoMessageScreen = ({ videoUrl, dimMusic, restartMusicForFinale }) => {
  const [callState, setCallState] = useState('incoming'); // 'incoming', 'connecting', 'connected', 'ended'
  const videoRef = useRef(null);
  
  const [displayedBody, setDisplayedBody] = useState('');
  const [showControls, setShowControls] = useState(false);
  const [phase, setPhase] = useState('alert'); // 'alert', 'pause', 'typing', 'done'
  const audioCtxRef = useRef(null);
  const [connectPhase, setConnectPhase] = useState(0); // 0: connecting, 1: signal acquired, 2: ready
  const [callTimer, setCallTimer] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [isAcceptTransitioning, setIsAcceptTransitioning] = useState(false);
  const [endPhase, setEndPhase] = useState(-1); // -1: not ending, 0: fading, 1: show text, 2: show subtext, 3: dual terminals, 4: airplane
  const [asciiArt, setAsciiArt] = useState('');
  const [asciiLines, setAsciiLines] = useState([]);
  const [asciiDisplayCount, setAsciiDisplayCount] = useState(0);
  const [typedMessage, setTypedMessage] = useState('');
  const [decryptText, setDecryptText] = useState('');
  const [messageComplete, setMessageComplete] = useState(false);
  const [departureStarted, setDepartureStarted] = useState(false);
  const [airplanePhase, setAirplanePhase] = useState(-1); // -1: departure text, 0: flight path, 1: flying, 2: night sky, 3: final text
  const [showDriveFallback, setShowDriveFallback] = useState(false);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);
  const [showTapToPlay, setShowTapToPlay] = useState(false);
  const acceptTransitionTimeoutRef = useRef(null);
  const iframePreloadRef = useRef(null);
  const driveFileId = getGoogleDriveFileId(videoUrl);
  // For Google Drive videos, always use the iframe embed — direct stream URLs are blocked by CORS on deployed sites
  const driveEmbedUrl = driveFileId ? `https://drive.google.com/file/d/${driveFileId}/preview?autoplay=1&hd=1` : null;
  const isDriveVideo = Boolean(driveFileId);
  // For non-Drive videos, use the URL directly
  const resolvedVideoSrc = isDriveVideo ? null : videoUrl;

  const alertText = "INCOMING TRANSMISSION...\nPRIORITY UPLINK";
  const fullBodyText = "CONTACT KURT ON SECURE\nVIDEO LINK 132.085 MHZ";

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const playBeep = () => {
    if (!audioCtxRef.current) return;
    try {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const oscillator = audioCtxRef.current.createOscillator();
      const gainNode = audioCtxRef.current.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, audioCtxRef.current.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioCtxRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.1);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtxRef.current.destination);
      oscillator.start();
      oscillator.stop(audioCtxRef.current.currentTime + 0.1);
    } catch (e) {}
  };

  useEffect(() => {
    if (callState === 'incoming') {
      initAudio();
      let index = 0;
      
      if (phase === 'alert') {
        setDisplayedBody('');
        setShowControls(false);
        const typingInterval = setInterval(() => {
          if (index <= alertText.length) {
            setDisplayedBody(alertText.substring(0, index));
            if (index < alertText.length && alertText.charAt(index) !== '\n' && alertText.charAt(index) !== ' ') {
               playBeep();
            }
            index++;
          } else {
            clearInterval(typingInterval);
            setTimeout(() => setPhase('pause'), 1500);
          }
        }, 50);
        return () => clearInterval(typingInterval);
      } else if (phase === 'pause') {
        setDisplayedBody('');
        setTimeout(() => setPhase('typing'), 500);
      } else if (phase === 'typing') {
        const typingInterval = setInterval(() => {
          if (index <= fullBodyText.length) {
            setDisplayedBody(fullBodyText.substring(0, index));
            if (index < fullBodyText.length && fullBodyText.charAt(index) !== '\n' && fullBodyText.charAt(index) !== ' ') {
               playBeep();
            }
            index++;
          } else {
            clearInterval(typingInterval);
            setPhase('done');
            setTimeout(() => setShowControls(true), 500);
          }
        }, 50);
        return () => clearInterval(typingInterval);
      }
    }
  }, [callState, phase]);

  const handleAccept = () => {
    if (isAcceptTransitioning || callState !== 'incoming') return;

    setIsAcceptTransitioning(true);
    setShowControls(false);
    acceptTransitionTimeoutRef.current = setTimeout(() => {
      setCallState('connecting');
      setConnectPhase(0);
      setIsAcceptTransitioning(false);
      acceptTransitionTimeoutRef.current = null;
    }, 650);
  };

  useEffect(() => {
    return () => {
      if (acceptTransitionTimeoutRef.current) {
        clearTimeout(acceptTransitionTimeoutRef.current);
      }
    };
  }, []);

  // Connecting sequence
  useEffect(() => {
    if (callState !== 'connecting') return;
    if (connectPhase === 0) {
      // After 2s show "Signal Acquired"
      const t = setTimeout(() => setConnectPhase(1), 2000);
      return () => clearTimeout(t);
    } else if (connectPhase === 1) {
      // After 1.5s go to connected
      const t = setTimeout(() => setConnectPhase(2), 1500);
      return () => clearTimeout(t);
    } else if (connectPhase === 2) {
      // Transition to connected - video will autoplay via separate useEffect
      const t = setTimeout(() => {
        setCallState('connected');
      }, 700);
      return () => clearTimeout(t);
    }
  }, [callState, connectPhase]);

  // Reset fallback states when videoUrl changes
  useEffect(() => {
    setShowDriveFallback(false);
    setVideoLoadFailed(false);
    setShowTapToPlay(false);
  }, [videoUrl]);

  // Preload Drive iframe during connecting phase so it's ready when we transition
  useEffect(() => {
    if (callState !== 'connecting' || !isDriveVideo) return;
    // Create a hidden iframe to start loading the Drive video early
    if (!iframePreloadRef.current) {
      const preloadIframe = document.createElement('iframe');
      preloadIframe.src = driveEmbedUrl;
      preloadIframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-9999;';
      preloadIframe.allow = 'autoplay; fullscreen';
      document.body.appendChild(preloadIframe);
      iframePreloadRef.current = preloadIframe;
    }
    return () => {
      // Cleanup preload iframe when we leave connecting
      if (iframePreloadRef.current) {
        try { document.body.removeChild(iframePreloadRef.current); } catch(e) {}
        iframePreloadRef.current = null;
      }
    };
  }, [callState, isDriveVideo, driveEmbedUrl]);

  // Play video when connected
  useEffect(() => {
    if (callState !== 'connected') return;

    if (isDriveVideo) {
      // Drive videos use iframe embed — mark as ready immediately
      if (dimMusic) dimMusic();
      setVideoReady(true);
      return;
    }

    // Non-Drive videos: try native <video> autoplay
    const t = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.play().then(() => {
          if (dimMusic) dimMusic();
          setTimeout(() => { if (videoRef.current) videoRef.current.muted = false; }, 500);
          setVideoReady(true);
        }).catch(e => {
          console.warn('Autoplay blocked:', e);
          // Show a tap-to-play overlay for mobile
          setShowTapToPlay(true);
          setVideoReady(true);
        });
      }
    }, 100);
    return () => clearTimeout(t);
  }, [callState, dimMusic, isDriveVideo]);

  // Fallback timeout — if the iframe seems stuck, show action buttons after 6s
  useEffect(() => {
    if (callState !== 'connected' || !isDriveVideo) return;
    const t = setTimeout(() => setShowDriveFallback(true), 6000);
    return () => clearTimeout(t);
  }, [callState, isDriveVideo]);

  // Handle tap-to-play for non-Drive videos (mobile autoplay blocked)
  const handleTapToPlay = () => {
    setShowTapToPlay(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().then(() => {
        if (dimMusic) dimMusic();
      }).catch(() => {});
    }
  };

  // Call timer
  useEffect(() => {
    if (callState !== 'connected') return;
    const interval = setInterval(() => setCallTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const beginCallFarewell = () => {
    if (restartMusicForFinale) restartMusicForFinale();
    setEndPhase(0);
  };

  const handleDecline = () => {
    if (callState === 'connected') {
      if (videoRef.current) videoRef.current.pause();
      beginCallFarewell();
      return;
    }
    setCallState('ended');
    setEndPhase(0);
  };

  const handleVideoEnd = () => {
    beginCallFarewell();
  };

  // End sequence
  useEffect(() => {
    if (endPhase === 0) {
      const t = setTimeout(() => {
        setCallState('ended');
        setEndPhase(1);
      }, 2000);
      return () => clearTimeout(t);
    } else if (endPhase === 1) {
      const t = setTimeout(() => setEndPhase(2), 1500);
      return () => clearTimeout(t);
    } else if (endPhase === 2) {
      // After 3s of "CHANNEL CLOSED", transition to dual terminals
      const t = setTimeout(() => setEndPhase(3), 3000);
      return () => clearTimeout(t);
    }
  }, [endPhase]);

  useEffect(() => {
    if (endPhase !== 3) return;

    // Fetch ASCII art and set up line-by-line printing
    fetch('/ascii-art.txt')
      .then(r => r.text())
      .then(text => {
        const lines = text.split('\n');
        setAsciiLines(lines);
        // Simulate decrypting first
        setDecryptText('DECRYPTING CLASSIFIED FILE...');
        setTimeout(() => {
          setDecryptText('ACCESS GRANTED');
          setTimeout(() => {
            setDecryptText('');
            /* One line/tick — interval chosen so ASCII finishes ~2.5s before Pilot's Log typing ends. */
            let currentLine = 0;
            const linesTotal = Math.max(lines.length, 1);
            const asciiMsDoneBeforeTypingEnds = 2500;
            const asciiRevealBudgetMs =
              PILOTS_LOG_TYPING_MS - ASCII_DECRYPT_MS - asciiMsDoneBeforeTypingEnds;
            const printIntervalMs = Math.min(
              260,
              Math.max(
                95,
                Math.floor(asciiRevealBudgetMs / linesTotal),
              ),
            );
            const printInterval = setInterval(() => {
              currentLine += 1;
              if (currentLine >= lines.length) {
                currentLine = lines.length;
                clearInterval(printInterval);
              }
              setAsciiDisplayCount(currentLine);
            }, printIntervalMs);
          }, 800);
        }, 1500);
      })
      .catch(() => setAsciiLines(['[ FILE NOT FOUND ]']));

    // Type the message line by line (starts with a delay so ASCII art gets a head start)
    const msgDelay = setTimeout(() => {
      let lineIndex = 0;
      let charIndex = 0;
      let current = '';
      const typeInterval = setInterval(() => {
        if (lineIndex >= PILOTS_FINAL_MESSAGE.length) {
          clearInterval(typeInterval);
          setMessageComplete(true);
          return;
        }
        const line = PILOTS_FINAL_MESSAGE[lineIndex];
        if (charIndex <= line.length) {
          const partial = line.substring(0, charIndex);
          setTypedMessage(current + partial);
          if (charIndex < line.length && line.charAt(charIndex) !== ' ' && line.charAt(charIndex) !== '>') {
            playBeep();
          }
          charIndex++;
        } else {
          current += line + '\n';
          lineIndex++;
          charIndex = 0;
        }
      }, 60);
      return () => clearInterval(typeInterval);
    }, 3400); // delay message typing so ASCII art prints first
    return () => clearTimeout(msgDelay);
  }, [endPhase]);

  // Smooth departure sequence: terminal fade → departure bridge → flight map
  useEffect(() => {
    if (!messageComplete) return;
    // Start fading the terminal after a longer emotional pause
    const t = setTimeout(() => setDepartureStarted(true), 3800);
    return () => clearTimeout(t);
  }, [messageComplete]);

  useEffect(() => {
    if (!departureStarted) return;
    // After fade overlay is fully opaque, switch to airplane scene
    const t = setTimeout(() => setEndPhase(4), 3600);
    return () => clearTimeout(t);
  }, [departureStarted]);

  useEffect(() => {
    if (endPhase !== 4) return;
    // -1: departure bridge text (already showing)
    // 0: Show flight map (after 3.2s)
    const t0 = setTimeout(() => setAirplanePhase(0), 3200);
    // 1: Airplane starts flying (after 5s)
    const t1 = setTimeout(() => setAirplanePhase(1), 5800);
    // 2: Night sky transition (after 11s)
    const t2 = setTimeout(() => setAirplanePhase(2), 12400);
    // 3: Final text (after 14s)
    const t3 = setTimeout(() => setAirplanePhase(3), 16000);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [endPhase]);

  if (callState === 'ended') {
    // Phase 4: Airplane Departure Transition
    if (endPhase >= 4) {
      return (
        <div style={{
          height: '100vh', width: '100vw', background: '#000',
          position: 'fixed', top: 0, left: 0,
          overflow: 'hidden'
        }}>
          {/* Night sky background - ONLY renders when needed */}
          {airplanePhase >= 2 && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: 'url(/night-sky.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              animation: 'nightSkyReveal 4s ease forwards',
              zIndex: 1
            }}></div>
          )}

          {/* Dim overlay */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: airplanePhase >= 2 ? 'rgba(0,0,0,0.35)' : '#000',
            transition: airplanePhase >= 2 ? 'background 4s ease' : 'none',
            zIndex: 2
          }}></div>

          {/* Departure bridge text - visible during phase -1 */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: airplanePhase === -1 ? 1 : 0,
            transition: 'opacity 2s ease',
            zIndex: 4,
            pointerEvents: 'none'
          }}>
            <div style={{
              fontSize: '0.7rem', letterSpacing: '4px', color: 'rgba(0,255,0,0.4)',
              fontFamily: '"Courier New", monospace', marginBottom: '20px',
              animation: 'fadeIn 2s ease'
            }}>
              ▸ SYSTEM NOTICE
            </div>
            <div style={{
              fontFamily: '"Courier New", monospace', color: '#00ff00',
              fontSize: 'clamp(0.85rem, 2vw, 1.1rem)', letterSpacing: '3px',
              textAlign: 'center', lineHeight: '2.2',
              textShadow: '0 0 20px rgba(0,255,0,0.3)',
              animation: 'fadeIn 2s ease'
            }}>
              HOLDING YOUR HAND THROUGH THIS DEPARTURE...
              <br />
              <span style={{ opacity: 0.5, fontSize: '0.8em' }}>PLOTTING COURSE: MNL → YYZ</span>
            </div>
            <div style={{
              width: '120px', height: '1px', margin: '25px auto',
              background: 'linear-gradient(90deg, transparent, rgba(0,255,0,0.4), transparent)'
            }}></div>
            <div style={{
              fontFamily: "'Caveat', cursive", color: 'rgba(0,255,0,0.6)',
              fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', textAlign: 'center',
              animation: 'fadeIn 3s ease 1s both'
            }}>
              "See you on the other side..."
            </div>
          </div>

          {/* Flight path map - visible during phase 0-1 */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: (airplanePhase >= 0 && airplanePhase < 2) ? 1 : 0,
            transition: 'opacity 2.5s ease',
            zIndex: 3
          }}>
            {/* Flight route SVG */}
            <svg viewBox="0 0 800 400" style={{
              width: '90%', maxWidth: '700px', height: 'auto',
              overflow: 'visible'
            }}>
              {/* Grid lines */}
              {Array.from({length: 9}).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} stroke="rgba(0,255,0,0.05)" strokeWidth="0.5" />
              ))}
              {Array.from({length: 17}).map((_, i) => (
                <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="400" stroke="rgba(0,255,0,0.05)" strokeWidth="0.5" />
              ))}

              {/* Flight path - curved arc from Manila to Toronto */}
              <path
                d="M 150 280 Q 400 50 680 180"
                fill="none"
                stroke="rgba(0,255,0,0.15)"
                strokeWidth="1"
                strokeDasharray="8 4"
              />

              {/* Animated flight trail */}
              <path
                d="M 150 280 Q 400 50 680 180"
                fill="none"
                stroke="#00ff00"
                strokeWidth="2"
                strokeDasharray="600"
                strokeDashoffset={airplanePhase >= 1 ? '0' : '600'}
                style={{
                  transition: 'stroke-dashoffset 5s ease-in-out',
                  filter: 'drop-shadow(0 0 6px rgba(0,255,0,0.8))'
                }}
              />

              {/* Contrail glow */}
              <path
                d="M 150 280 Q 400 50 680 180"
                fill="none"
                stroke="rgba(0,255,0,0.3)"
                strokeWidth="6"
                strokeDasharray="600"
                strokeDashoffset={airplanePhase >= 1 ? '0' : '600'}
                style={{
                  transition: 'stroke-dashoffset 5s ease-in-out',
                  filter: 'blur(4px)'
                }}
              />

              {/* Manila marker */}
              <g>
                <circle cx="150" cy="280" r="6" fill="none" stroke="#00ff00" strokeWidth="1.5" opacity="0.8" />
                <circle cx="150" cy="280" r="3" fill="#00ff00" opacity="0.9">
                  <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
                </circle>
                <text x="150" y="305" fill="#00ff00" fontSize="11" textAnchor="middle" fontFamily="Courier New" letterSpacing="2" opacity="0.8">MNL</text>
                <text x="150" y="320" fill="#00ff00" fontSize="8" textAnchor="middle" fontFamily="Courier New" letterSpacing="1" opacity="0.4">MANILA</text>
              </g>

              {/* Toronto marker */}
              <g>
                <circle cx="680" cy="180" r="6" fill="none" stroke="#00ff00" strokeWidth="1.5" opacity="0.8" />
                <circle cx="680" cy="180" r="3" fill="#00ff00" opacity="0.9">
                  <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
                </circle>
                <text x="680" y="205" fill="#00ff00" fontSize="11" textAnchor="middle" fontFamily="Courier New" letterSpacing="2" opacity="0.8">YYZ</text>
                <text x="680" y="220" fill="#00ff00" fontSize="8" textAnchor="middle" fontFamily="Courier New" letterSpacing="1" opacity="0.4">TORONTO</text>
              </g>

              {/* Airplane icon moving along the path */}
              {airplanePhase >= 1 && (
                <g style={{
                  animation: 'flyAlongPath 5s ease-in-out forwards'
                }}>
                  <animateMotion dur="5s" fill="freeze" rotate="auto" path="M 150 280 Q 400 50 680 180" />
                  <polygon
                    points="0,-8 -4,8 0,5 4,8"
                    fill="#00ff00"
                    style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,0,0.8))' }}
                  />
                </g>
              )}

              {/* Flight info text */}
              <text x="400" y="380" fill="#00ff00" fontSize="9" textAnchor="middle" fontFamily="Courier New" letterSpacing="3" opacity="0.3">
                FLIGHT KJ-2026 • {new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}).toUpperCase()}
              </text>
            </svg>

            {/* Flight status bar */}
            <div style={{
              marginTop: '30px',
              fontFamily: '"Courier New", monospace',
              color: '#00ff00',
              fontSize: '0.75rem',
              letterSpacing: '3px',
              textAlign: 'center',
              opacity: 0.6
            }}>
              {airplanePhase === 0 && 'TRACING THE MILES BETWEEN US...'}
              {airplanePhase === 1 && '▸ DEPARTURE: IN PROGRESS'}
            </div>
          </div>

          {/* Night sky phase content */}
          {airplanePhase >= 2 && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              zIndex: 5,
              animation: 'fadeIn 2s ease'
            }}>
              {/* Animated airplane flying across the night sky */}
              <div style={{
                position: 'absolute',
                top: '30%',
                animation: 'flyAcrossSky 10s ease-in-out forwards',
                zIndex: 6
              }}>
                {/* Outer smoke trail - wide and diffused */}
                <div style={{
                  position: 'absolute',
                  right: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '250vw',
                  height: '30px',
                  background: 'linear-gradient(to left, rgba(255,255,255,0.12), rgba(255,255,255,0.06), rgba(255,255,255,0.02), transparent)',
                  filter: 'blur(12px)',
                  borderRadius: '50%'
                }}></div>
                {/* Mid smoke trail */}
                <div style={{
                  position: 'absolute',
                  right: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '200vw',
                  height: '16px',
                  background: 'linear-gradient(to left, rgba(255,255,255,0.25), rgba(255,255,255,0.1), rgba(255,255,255,0.03), transparent)',
                  filter: 'blur(6px)',
                  borderRadius: '50%'
                }}></div>
                {/* Inner bright contrail core */}
                <div style={{
                  position: 'absolute',
                  right: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '150vw',
                  height: '4px',
                  background: 'linear-gradient(to left, rgba(255,255,255,0.7), rgba(255,255,255,0.3), rgba(255,255,255,0.05), transparent)',
                  filter: 'blur(1.5px)'
                }}></div>
                {/* Upper engine smoke wisp */}
                <div style={{
                  position: 'absolute',
                  right: '100%',
                  top: '50%',
                  transform: 'translateY(calc(-50% - 8px))',
                  width: '180vw',
                  height: '10px',
                  background: 'linear-gradient(to left, rgba(255,255,255,0.08), transparent)',
                  filter: 'blur(8px)',
                  borderRadius: '50%'
                }}></div>
                {/* Lower engine smoke wisp */}
                <div style={{
                  position: 'absolute',
                  right: '100%',
                  top: '50%',
                  transform: 'translateY(calc(-50% + 8px))',
                  width: '180vw',
                  height: '10px',
                  background: 'linear-gradient(to left, rgba(255,255,255,0.08), transparent)',
                  filter: 'blur(8px)',
                  borderRadius: '50%'
                }}></div>
                {/* The plane itself - custom image */}
                <img 
                  src="/plane-icon.png" 
                  alt="" 
                  style={{ 
                    width: '130px', height: 'auto', 
                    filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5)) brightness(1.2)'
                  }} 
                />
              </div>

              {/* Final emotional text - appears in phase 3 */}
              {airplanePhase >= 3 && (
                <div style={{
                  textAlign: 'center',
                  animation: 'fadeInSlow 3s ease forwards',
                  padding: '0 2rem'
                }}>
                  <div style={{
                    fontSize: 'clamp(0.7rem, 1.5vw, 0.85rem)',
                    fontFamily: '"Courier New", monospace',
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                    marginBottom: '20px'
                  }}>
                    FLIGHT KJ-2026 • MNL → YYZ
                  </div>

                  <div style={{
                    fontFamily: "'Caveat', cursive",
                    fontSize: 'clamp(1.8rem, 5vw, 3rem)',
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: '1.4',
                    marginBottom: '15px',
                    textShadow: '0 0 30px rgba(255,255,255,0.2)'
                  }}>
                    No matter how far you fly,
                    <br />
                    my heart is always your home.
                  </div>

                  <div style={{
                    width: '80px',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    margin: '25px auto'
                  }}></div>

                  <div style={{
                    fontFamily: "'Caveat', cursive",
                    fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
                    color: 'rgba(255,255,255,0.5)',
                    animation: 'fadeInSlow 2s ease 1s forwards',
                    opacity: 0
                  }}>
                    Safe travels, my lady. 🤍
                  </div>

                  <div style={{
                    marginTop: '40px',
                    fontFamily: '"Courier New", monospace',
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.15)',
                    letterSpacing: '3px',
                    animation: 'fadeInSlow 2s ease 2s forwards',
                    opacity: 0
                  }}>
                    — TRANSMISSION COMPLETE —
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Twinkling stars overlay */}
          {airplanePhase >= 2 && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 4, pointerEvents: 'none' }}>
              {Array.from({length: 30}).map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 3 + 1}px`,
                  height: `${Math.random() * 3 + 1}px`,
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  opacity: 0,
                  animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out ${Math.random() * 3}s infinite`
                }} />
              ))}
            </div>
          )}

          <style>{`
            @keyframes nightSkyReveal {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes flyAcrossSky {
              0% { left: -10%; opacity: 0; }
              3% { opacity: 1; }
              80% { opacity: 1; }
              100% { left: 110%; opacity: 0; }
            }
            @keyframes fadeInSlow {
              from { opacity: 0; transform: translateY(15px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes twinkle {
              0%, 100% { opacity: 0; }
              50% { opacity: 0.8; }
            }
          `}</style>
        </div>
      );
    }

    // Phase 3: Dual Terminal View
    if (endPhase >= 3) {
      return (
        <div style={{
          height: '100vh', background: '#000', color: '#00ff00',
          fontFamily: '"Courier New", Courier, monospace',
          display: 'flex', flexDirection: 'column',
          animation: 'fadeIn 1.5s ease'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 20px', textAlign: 'center',
            borderBottom: '1px solid rgba(0,255,0,0.15)',
            fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.5
          }}>
            SECURE TERMINAL — CLASSIFIED
          </div>

          {/* Dual terminal container */}
          <div style={{
            flex: 1, display: 'flex', overflow: 'hidden',
            flexDirection: window.innerWidth < 700 ? 'column' : 'row'
          }}>
            {/* LEFT TERMINAL — ASCII Art */}
            <div style={{
              flex: '0 0 auto', width: window.innerWidth >= 700 ? '50%' : '100%',
              overflow: 'auto', padding: '15px',
              borderRight: window.innerWidth >= 700 ? '1px solid rgba(0,255,0,0.15)' : 'none',
              borderBottom: window.innerWidth < 700 ? '1px solid rgba(0,255,0,0.15)' : 'none',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '0.7rem', letterSpacing: '2px', opacity: 0.4,
                marginBottom: '10px', textTransform: 'uppercase'
              }}>
                ▸ FILE://CLASSIFIED/MEMORY.DAT
              </div>

              {decryptText && (
                <div style={{
                  fontSize: '0.85rem', letterSpacing: '2px',
                  color: decryptText === 'ACCESS GRANTED' ? '#4ade80' : '#00ff00',
                  animation: 'blink 1s step-end infinite'
                }}>
                  {decryptText}
                </div>
              )}

              {asciiLines.length > 0 && asciiDisplayCount > 0 && (
                <pre style={{
                  fontSize: 'min(0.4rem, 1vw)', lineHeight: '1.15',
                  color: '#00ff00', margin: 0, whiteSpace: 'pre',
                  overflow: 'auto', opacity: 0.85
                }}>
                  {asciiLines.slice(0, asciiDisplayCount).join('\n')}
                </pre>
              )}
            </div>

            {/* RIGHT TERMINAL — Message */}
            <div style={{
              flex: 1, overflow: 'auto', padding: '15px',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{
                fontSize: '0.7rem', letterSpacing: '2px', opacity: 0.4,
                marginBottom: '10px', textTransform: 'uppercase'
              }}>
                ▸ PILOT'S LOG // FOR YOUR JOURNEY
              </div>

              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <pre style={{
                  fontSize: 'min(1rem, 2.5vw)', lineHeight: '1.8',
                  color: '#00ff00', margin: 0, whiteSpace: 'pre-wrap',
                  fontFamily: '"Courier New", Courier, monospace'
                }}>
                  {typedMessage}<span style={{ animation: 'blink 1s step-end infinite' }}>_</span>
                </pre>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 20px', textAlign: 'center',
            borderTop: '1px solid rgba(0,255,0,0.15)',
            fontSize: '0.65rem', letterSpacing: '2px', opacity: 0.3
          }}>
            END OF TRANSMISSION — ALL CHANNELS CLOSED
          </div>

          {/* Departure fade overlay - smooth fade to black before airplane scene */}
          {departureStarted && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: '#000', zIndex: 9999,
              animation: 'departureFade 3.6s ease forwards'
            }}>
              <style>{`
                @keyframes departureFade {
                  0% { opacity: 0; }
                  100% { opacity: 1; }
                }
              `}</style>
            </div>
          )}
        </div>
      );
    }

    // Phase 1-2: Transmission Complete screen
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#000', color: '#00ff00',
        fontFamily: '"Courier New", Courier, monospace'
      }}>
        {/* Radar rings */}
        <div style={{
          width: '70px', height: '70px', borderRadius: '50%',
          border: '1px solid rgba(0,255,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '1px solid rgba(0,255,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              backgroundColor: 'rgba(0,255,0,0.4)',
              boxShadow: '0 0 10px rgba(0,255,0,0.3)'
            }}></div>
          </div>
        </div>

        {endPhase >= 1 && (
          <div style={{
            textAlign: 'center',
            animation: 'fadeIn 1s ease'
          }}>
            <div style={{
              fontSize: '1.3rem', letterSpacing: '4px', fontWeight: 'bold',
              textTransform: 'uppercase', marginBottom: '12px',
              textShadow: '0 0 20px rgba(0,255,0,0.5)'
            }}>
              MESSAGE RECEIVED
            </div>
            <div style={{ width: '180px', height: '2px', background: 'linear-gradient(90deg, transparent, #00ff00, transparent)', margin: '0 auto 15px' }}></div>
          </div>
        )}

        {endPhase >= 2 && (
          <div style={{
            textAlign: 'center',
            animation: 'fadeIn 1s ease'
          }}>
            <div style={{ fontSize: '0.75rem', letterSpacing: '3px', opacity: 0.4, marginBottom: '6px' }}>
              SIGNAL TERMINATED
            </div>
            <div style={{ fontSize: '0.7rem', letterSpacing: '2px', opacity: 0.3 }}>
              FREQ 132.085 MHZ — CHANNEL CLOSED
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="facetime-container animate-fade-in" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: '#000', color: '#fff',
      display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      
      {/* Connecting State */}
      {callState === 'connecting' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: '#000', zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Courier New", Courier, monospace', color: '#00ff00'
        }}>
          {/* Radar / signal animation */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            border: '2px solid rgba(0,255,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '30px', position: 'relative'
          }}>
            <div style={{
              width: '50px', height: '50px', borderRadius: '50%',
              border: '2px solid rgba(0,255,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                backgroundColor: connectPhase >= 1 ? '#00ff00' : 'transparent',
                border: '2px solid #00ff00',
                animation: connectPhase < 1 ? 'blink 1s step-end infinite' : 'none',
                boxShadow: connectPhase >= 1 ? '0 0 15px #00ff00, 0 0 30px rgba(0,255,0,0.4)' : 'none',
                transition: 'all 0.5s ease'
              }}></div>
            </div>
          </div>

          <div style={{ fontSize: '1.1rem', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '10px' }}>
            {connectPhase === 0 && 'ESTABLISHING UPLINK...'}
            {connectPhase === 1 && 'SIGNAL ACQUIRED'}
            {connectPhase === 2 && 'CONNECTING VIDEO FEED...'}
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.5, letterSpacing: '2px' }}>
            {connectPhase === 0 && 'FREQ 132.085 MHZ'}
            {connectPhase >= 1 && 'SECURE CHANNEL ACTIVE'}
          </div>

          {/* Loading bar */}
          <div style={{ width: '200px', height: '3px', backgroundColor: 'rgba(0,255,0,0.15)', marginTop: '25px', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', backgroundColor: '#00ff00',
              width: connectPhase === 0 ? '40%' : connectPhase === 1 ? '75%' : '100%',
              transition: 'width 1.5s ease',
              boxShadow: '0 0 8px #00ff00'
            }}></div>
          </div>
        </div>
      )}

      {/* Background for Incoming State - FMC CPDLC Style */}
      {callState === 'incoming' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.85)), url(/cockpit-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: isAcceptTransitioning ? 0 : 1,
          transform: isAcceptTransitioning ? 'scale(1.02)' : 'scale(1)',
          filter: isAcceptTransitioning ? 'blur(2px)' : 'blur(0)',
          transition: 'opacity 650ms ease, transform 650ms cubic-bezier(0.22, 1, 0.36, 1), filter 650ms ease',
          pointerEvents: isAcceptTransitioning ? 'none' : 'auto'
        }}>
          <div style={{
            width: 'min(100%, 600px, 58vh)',
            position: 'relative',
            margin: '0 auto',
            containerType: 'inline-size'
          }}>
            {/* Backdrop behind the image to block the cockpit showing through the transparent screen hole */}
            <div style={{
              position: 'absolute', top: '5%', left: '10%', right: '10%', height: '50%',
              backgroundColor: '#050505', borderRadius: '4cqw'
            }}></div>

            <img src="/fmc-bg.png" alt="FMC" style={{ 
              width: '100%', height: 'auto', display: 'block', position: 'relative', zIndex: 1
            }} />

            {/* Shadow overlays on all 4 sides to hide the obvious image cuts */}
            {/* Top shadow */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '15%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)', zIndex: 2, pointerEvents: 'none' }}></div>
            {/* Bottom shadow */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '15%', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', zIndex: 2, pointerEvents: 'none' }}></div>
            {/* Left shadow */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '12%', background: 'linear-gradient(to right, rgba(0,0,0,0.9), transparent)', zIndex: 2, pointerEvents: 'none' }}></div>
            {/* Right shadow */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '12%', background: 'linear-gradient(to left, rgba(0,0,0,0.9), transparent)', zIndex: 2, pointerEvents: 'none' }}></div>
            
            {/* Screen Overlay Area - Centered and absolutely positioned to overlay the image's screen */}
            {/* Note: You may need to tweak top, left, width, and height in this div if the text doesn't perfectly align with the generated image screen */}
            <div style={{
              position: 'absolute',
              top: '9%', left: '18%', width: '64%', height: '32%',
              display: 'flex', flexDirection: 'column',
              padding: '2cqw',
              fontFamily: '"Courier New", Courier, monospace',
              color: '#00ff00',
              fontSize: '2.5cqw',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              lineHeight: '1.4',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 8cqw rgba(0,0,0,0.95)',
              borderRadius: '2cqw',
              zIndex: 2,
              transition: 'opacity 620ms ease, transform 620ms ease',
              opacity: isAcceptTransitioning ? 0.2 : 1,
              transform: isAcceptTransitioning ? 'translateY(-0.6cqw)' : 'translateY(0)'
            }}>
              {/* CRT Scanline Overlay */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
                backgroundSize: '100% 4px',
                zIndex: 20,
                pointerEvents: 'none'
              }}></div>
              
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: '1.5cqw', color: '#00ff00', fontWeight: 'bold', fontSize: '2.8cqw' }}>
                CPDLC-MESSAGE 01/01
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5cqw', fontSize: '2cqw', color: '#a3a3a3', opacity: phase === 'alert' ? 0 : 1 }}>
                <span>LOGON TO<br/><span style={{ color: '#00ff00', fontSize: '2.8cqw' }}>KJ2026</span></span>
                <span style={{ textAlign: 'right' }}>STATUS<br/><span style={{ color: '#00ff00', fontSize: '2.8cqw' }}>OPEN</span></span>
              </div>
              
              <div style={{ marginBottom: '2cqw', color: '#00ff00', whiteSpace: 'pre-wrap', minHeight: '3em' }}>
                {displayedBody}<span style={{ animation: 'blink 1s step-end infinite' }}>_</span>
              </div>

              {showControls && (
                <div className="animate-fade-in" style={{ position: 'absolute', bottom: '1.5cqw', left: '1.5cqw', right: '1.5cqw' }}>
                  <div style={{ textAlign: 'center', margin: '1.5cqw 0', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '2px dashed #00ff00', zIndex: 1, opacity: 0.5 }}></div>
                    <span style={{ padding: '0 1cqw', position: 'relative', zIndex: 2, color: '#00ff00', opacity: 0.8, backgroundColor: '#0f0f0f' }}>RESPONSE</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span style={{ cursor: 'pointer' }} onClick={handleDecline}>&lt; LATER</span>
                    <span style={{ cursor: 'pointer' }} onClick={handleAccept}>ACCEPT &gt;</span>
                  </div>
                </div>
              )}
            </div>

            {/* Invisible clickable areas roughly over where the physical LSK buttons are in the image */}
            {showControls && (
              <>
                 {/* Left bottom LSK (Reject) */}
                 <div onClick={handleDecline} style={{ position: 'absolute', top: '35%', left: '10%', width: '12%', height: '6%', cursor: 'pointer' }} title="Reject"></div>
                 {/* Right bottom LSK (Accept) */}
                 <div onClick={handleAccept} style={{ position: 'absolute', top: '35%', right: '10%', width: '12%', height: '6%', cursor: 'pointer' }} title="Accept"></div>
                 {/* EXEC button (Assuming it's bottom right of keyboard) */}
                 <div onClick={handleAccept} style={{ position: 'absolute', bottom: '25%', right: '20%', width: '12%', height: '6%', cursor: 'pointer' }} title="EXEC"></div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Connected State - Video Call UI */}
      {callState === 'connected' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: '#0a0a0a', zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          {/* Top bar */}
          <div className="animate-fade-in" style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            padding: '12px 20px',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 20
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
              padding: '6px 18px', borderRadius: '20px',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>✈️ Same Sky Link</span>
              <span style={{ fontSize: '0.85rem', color: '#4ade80' }}>{formatTime(callTimer)}</span>
            </div>
          </div>

          <div className="video-container-responsive" style={{
            opacity: videoReady ? 1 : 0,
            transform: videoReady ? 'scale(1)' : 'scale(0.85)',
          }}>
            {isDriveVideo ? (
              <>
                {/* Google Drive iframe embed — this is the most reliable way to play Drive videos on deployed sites */}
                <iframe
                  src={driveEmbedUrl}
                  title="Call video"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                />
                {/* Loading overlay — shows a subtle spinner while iframe loads */}
                {!showDriveFallback && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 2, pointerEvents: 'none',
                    animation: 'fadeIn 0.5s ease'
                  }}>
                    <div style={{
                      width: '36px', height: '36px',
                      border: '3px solid rgba(255,255,255,0.15)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }}></div>
                    <div style={{
                      marginTop: '14px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)',
                      letterSpacing: '2px', fontFamily: '"Courier New", monospace'
                    }}>
                      LOADING VIDEO...
                    </div>
                  </div>
                )}
                {/* Fallback buttons if Drive iframe appears stuck */}
                {showDriveFallback && (
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: '24px',
                    transform: 'translateX(-50%)',
                    zIndex: 8,
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.72)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    animation: 'fadeIn 0.5s ease'
                  }}>
                    <div style={{ width: '100%', textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', letterSpacing: '1px' }}>
                      Video not loading? Try these:
                    </div>
                    <button
                      onClick={() => window.open(videoUrl, '_blank', 'noopener,noreferrer')}
                      style={{
                        background: 'rgba(255,255,255,0.14)',
                        border: '1px solid rgba(255,255,255,0.22)',
                        color: '#fff',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.25)'}
                      onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.14)'}
                    >
                      📺 Open in Google Drive
                    </button>
                    <button
                      onClick={beginCallFarewell}
                      style={{
                        background: '#ff3b30',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={e => e.target.style.background = '#ff5147'}
                      onMouseLeave={e => e.target.style.background = '#ff3b30'}
                    >
                      Skip video →
                    </button>
                  </div>
                )}
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </>
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={resolvedVideoSrc}
                  className="responsive-video"
                  autoPlay
                  playsInline
                  preload="auto"
                  onError={() => {
                    setVideoLoadFailed(true);
                  }}
                  onEnded={handleVideoEnd}
                />
                {/* Tap to play overlay for mobile autoplay restrictions */}
                {showTapToPlay && (
                  <div
                    onClick={handleTapToPlay}
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.7)',
                      cursor: 'pointer', zIndex: 6,
                      animation: 'fadeIn 0.5s ease'
                    }}
                  >
                    <div style={{
                      width: '70px', height: '70px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid rgba(255,255,255,0.3)',
                      marginBottom: '16px',
                      transition: 'transform 0.2s ease'
                    }}>
                      <div style={{
                        width: 0, height: 0,
                        borderLeft: '22px solid white',
                        borderTop: '14px solid transparent',
                        borderBottom: '14px solid transparent',
                        marginLeft: '5px'
                      }}></div>
                    </div>
                    <div style={{
                      fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)',
                      letterSpacing: '2px', fontFamily: '"Courier New", monospace'
                    }}>
                      TAP TO PLAY
                    </div>
                  </div>
                )}
                {/* Error state for non-Drive videos */}
                {videoLoadFailed && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.85)', zIndex: 6
                  }}>
                    <div style={{ fontSize: '1.2rem', color: '#ff6b6b', marginBottom: '16px' }}>
                      Video failed to load
                    </div>
                    <button
                      onClick={beginCallFarewell}
                      style={{
                        background: '#ff3b30', border: 'none', color: '#fff',
                        borderRadius: '10px', padding: '10px 20px',
                        cursor: 'pointer', fontSize: '0.9rem'
                      }}
                    >
                      Continue →
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Fade overlay when video ends */}
            {endPhase >= 0 && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: '#000',
                opacity: endPhase >= 0 ? 1 : 0,
                transition: 'opacity 2s ease',
                zIndex: 5
              }}></div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="animate-fade-in" style={{
            position: 'absolute', bottom: '20px', left: '20px', right: '20px', zIndex: 20
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-evenly', alignItems: 'center',
              background: 'rgba(30,30,30,0.85)', backdropFilter: 'blur(15px)',
              padding: '16px', borderRadius: '28px',
              maxWidth: '350px', margin: '0 auto'
            }}>
              <button style={{
                background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
                width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer'
              }}>
                <MicOff size={22} />
              </button>
              <button onClick={handleDecline} style={{
                background: '#ff3b30', border: 'none', borderRadius: '50%',
                width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer'
              }}>
                <PhoneOff size={26} />
              </button>
              <button style={{
                background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
                width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer'
              }}>
                <Video size={22} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VideoMessageScreen;
