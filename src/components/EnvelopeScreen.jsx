import React, { useState } from 'react';

const EnvelopeScreen = ({ onOpenComplete }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    if (isOpen) return;
    setIsOpen(true);
    
    // Smooth transition cross-fade then move to reading screen
    setTimeout(() => {
      onOpenComplete();
    }, 1800);
  };

  return (
    <div className="flex-center animate-fade-in" style={{ 
      minHeight: '100vh', 
      flexDirection: 'column',
      backgroundImage: 'url(/background.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 0 }}></div>
      <div style={{position: 'absolute', top: '15%', color: 'white', letterSpacing: '2px', fontSize: '0.8rem', opacity: 0.8, zIndex: 1, textTransform: 'uppercase' }}>
          UNLOCKED
      </div>

      <div 
        style={{ 
          position: 'relative', 
          zIndex: 1, 
          marginTop: '20px', 
          width: '90vw', 
          maxWidth: '600px', 
          height: '60vh', 
          maxHeight: '600px', 
          cursor: isOpen ? 'default' : 'pointer',
          transition: 'transform 0.2s ease',
          transform: isOpen ? 'scale(1)' : 'scale(1.02)'
        }}
        onClick={handleOpen}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.transform = 'scale(1.05)' }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.transform = 'scale(1.02)' }}
      >
        <img 
            src="/envelope_open.png" 
            alt="Opened Envelope" 
            style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                opacity: isOpen ? 1 : 0,
                transition: 'opacity 0.6s ease-in-out',
                zIndex: 1
            }} 
        />
        <img 
            src="/envelope_closed.png" 
            alt="Closed Envelope" 
            style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                opacity: isOpen ? 0 : 1,
                transition: 'opacity 0.4s ease-in-out',
                zIndex: 2,
                filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.2))'
            }} 
        />
      </div>
      
      {!isOpen && (
        <p style={{ position: 'relative', zIndex: 1, color: 'white', marginTop: '30px', opacity: 0.7, fontSize: '0.9rem', animation: 'floatLight 2s infinite' }}>
          Tap to open
        </p>
      )}
    </div>
  );
};

export default EnvelopeScreen;
