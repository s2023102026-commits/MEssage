import React, { useState, useEffect } from 'react';
import { Plane, PlayCircle, PauseCircle, Music, Coffee, Heart, Camera } from 'lucide-react';

const LetterScreen = ({ config, onFinish, isPlaying, togglePlayPause }) => {
  const { title, message, photos } = config;
  
  const [displayedText, setDisplayedText] = useState('');
  const [timeHome, setTimeHome] = useState('');
  const [timeCanada, setTimeCanada] = useState('');
  const [psRevealed, setPsRevealed] = useState(false);
  const [isConnectingFlight, setIsConnectingFlight] = useState(false);

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    setDisplayedText(''); 
    
    const startDelay = setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (i < message.length) {
          setDisplayedText(prev => prev + message.charAt(i));
          i++;
        } else {
          clearInterval(typingInterval);
        }
      }, 40);
      return () => clearInterval(typingInterval);
    }, 800);
    
    return () => clearTimeout(startDelay);
  }, [message]);

  // Clocks for Manila and Toronto
  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      
      const manilaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
      setTimeHome(manilaTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      
      const canadaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Toronto"}));
      setTimeCanada(canadaTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    updateClocks();
    const interval = setInterval(updateClocks, 60000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  
  // Decide which photo goes where. We assume there are at least 2 photos.
  const inlinePhoto = photos && photos.length > 0 ? photos[0] : null;
  const polaroidPhoto = photos && photos.length > 1 ? photos[1] : inlinePhoto;

  return (
    <div style={{ 
      minHeight: '100vh', 
      position: 'relative',
      overflow: 'hidden',
      backgroundImage: 'url(/background.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }}>
      {/* Background Dim overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 0 }}></div>
      
      {/* Parallax Fireflies/Stars */}
      <div className="particle-container">
        {Array.from({ length: 40 }).map((_, i) => (
          <div 
            key={i} 
            className="particle-glow" 
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 5 + 5}s`
            }}
          />
        ))}
      </div>

      <div className="container animate-fade-in" style={{ position: 'relative', zIndex: 1, paddingBottom: '4rem', paddingTop: '3rem' }}>
        
        {/* Dual Timezone Clocks */}
        <div className="timezone-container">
           <div className="clock-box">
             <span className="clock-label">Manila, PH</span>
             <span className="clock-time">{timeHome}</span>
           </div>
           <Plane size={24} color="#cbd5e1" style={{ opacity: 0.8, alignSelf: 'center', transform: 'rotate(45deg)' }} />
           <div className="clock-box">
             <span className="clock-label">Toronto, CAN</span>
             <span className="clock-time">{timeCanada}</span>
           </div>
        </div>

        {/* Cassette Tape UI */}
        <div className="cassette-tape">
          <div className="cassette-label">
             <div className="tape-title">"Our Song"</div>
             <div className="tape-reels">
               <div className={`reel ${isPlaying ? 'spin' : ''}`}></div>
               <div className={`reel ${isPlaying ? 'spin' : ''}`}></div>
             </div>
          </div>
          <button className="play-btn" onClick={togglePlayPause}>
            {isPlaying ? <PauseCircle size={40} /> : <PlayCircle size={40} />}
          </button>
        </div>

        {/* Floating Paper */}
        <div className="animate-float" style={{ perspective: '1000px', marginTop: '2rem' }}>
          <div className="lined-paper" style={{ transform: 'rotateX(5deg)' }}>
            
            <div style={{ position: 'absolute', top: '1.5rem', right: '2rem', fontSize: '0.75rem', fontFamily: "'Inter', sans-serif", letterSpacing: '0.05em', color: '#555', fontWeight: '600' }}>
              {today}
            </div>

            <h1 style={{ fontFamily: "'Caveat', cursive", fontSize: '2.2rem', color: '#2f3542', marginBottom: '1.5rem', marginTop: '1rem', fontWeight: 600 }}>
              Dear Kim,
            </h1>

            <div 
              style={{ 
                fontFamily: "'Caveat', cursive",
                fontSize: '1.4rem', 
                lineHeight: '2.5rem',
                color: '#2f3542',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {displayedText}
              <span style={{ borderRight: '2px solid #2f3542', animation: 'blink 1s step-end infinite', marginLeft: '2px' }}>&nbsp;</span>
            </div>

            {inlinePhoto && (
               <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                 <img src={inlinePhoto} alt="Memory" style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
               </div>
            )}

            <div style={{ textAlign: 'right', marginTop: '5.5rem', fontSize: '1.4rem', color: '#2f3542', fontFamily: "'Caveat', cursive", fontWeight: 600 }}>
              <div>With love,</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{title || "To Kurt"}</div>
            </div>

          </div>
        </div>



        {/* Realistic Boarding Pass */}
        <div className="boarding-pass-realistic">
          <div className="bp-left">
            <div className="bp-header">
              <span>BOARDING PASS</span>
              <span>ECONOMY CLASS</span>
            </div>
            <div className="bp-flight-info">
              <div className="bp-city">
                <h2>MNL</h2>
                <span>MANILA</span>
              </div>
              <Plane size={24} color="#64748b" style={{ transform: 'rotate(45deg)' }} />
              <div className="bp-city">
                <h2>YYZ</h2>
                <span>TORONTO</span>
              </div>
            </div>
            <div className="bp-details-grid">
              <div>
                <label>PASSENGER</label>
                <strong>Kim</strong>
              </div>
              <div>
                <label>FLIGHT</label>
                <strong>KJ-2026</strong>
              </div>
              <div>
                <label>DATE</label>
                <strong>{today}</strong>
              </div>
              <div>
                <label>GATE</label>
                <strong>01</strong>
              </div>
            </div>
          </div>
          <div className="bp-right">
            <div className="bp-barcode" style={{ marginTop: 0, marginBottom: '15px' }}></div>
            <div className="bp-stub-info">
              <label>SPECIAL OFFER</label>
              <h3 style={{ marginBottom: '15px' }}>One Late-Night FaceTime</h3>
            </div>
            <button 
              className="btn-primary"
              style={{
                background: '#ff4757',
                padding: '10px 16px',
                fontSize: '0.95rem',
                boxShadow: '0 4px 10px rgba(255, 71, 87, 0.3)',
                width: '100%',
                display: 'flex',
                justifyContent: 'center'
              }}
              onClick={() => {
                setIsConnectingFlight(true);
                setTimeout(() => onFinish(), 3500);
              }}
            >
              <Plane size={18} style={{ marginRight: '6px' }} />
              Continue Flight
            </button>
          </div>
        </div>

        {/* Final Polaroid */}
        {polaroidPhoto && (
          <div className="final-polaroid-wrapper">
             <div className="polaroid">
               <img src={polaroidPhoto} alt="Until next time" />
               <div className="polaroid-caption">Until next time.</div>
             </div>
          </div>
        )}


      </div>

      {isConnectingFlight && (
        <div className="animate-fade-in" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#111',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img 
            src="/facetime-icon.png" 
            alt="Connecting FaceTime" 
            className="animate-heartbeat"
            style={{ width: '250px', height: 'auto' }} 
          />
          <p style={{ color: 'white', marginTop: '2rem', letterSpacing: '4px', fontSize: '1.2rem', fontFamily: "'Inter', sans-serif" }}>
            CONNECTING TO IN-FLIGHT WI-FI...
          </p>
        </div>
      )}
      
      <style>{`
        @keyframes blink {
          0%, 100% { border-color: transparent }
          50% { border-color: #2f3542 }
        }
      `}</style>
    </div>
  );
};

export default LetterScreen;
