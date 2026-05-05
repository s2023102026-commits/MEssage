import React, { useState } from 'react';

const PinScreen = ({ correctPin, onUnlock }) => {
  const [digits, setDigits] = useState([0, 0, 0, 0]);
  const [errorShake, setErrorShake] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const incrementDigit = (index) => {
    setDigits(prev => {
      const newDigits = [...prev];
      newDigits[index] = (newDigits[index] + 1) % 10;
      return newDigits;
    });
  };

  const decrementDigit = (index) => {
    setDigits(prev => {
      const newDigits = [...prev];
      newDigits[index] = newDigits[index] === 0 ? 9 : newDigits[index] - 1;
      return newDigits;
    });
  };

  const handleEnter = () => {
    const enteredPin = digits.join('');
    if (enteredPin === correctPin) {
      setIsUnlocked(true);
      setTimeout(() => {
        onUnlock();
      }, 800); // Wait for unlock animation
    } else {
      setErrorShake(true);
      setTimeout(() => {
        setErrorShake(false);
        setDigits([0, 0, 0, 0]); // Reset on error
      }, 500);
    }
  };

  return (
    <div className="flex-center animate-fade-in" style={{ 
      minHeight: '100vh', 
      flexDirection: 'column',
      backgroundImage: 'url(/background.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      overflow: 'hidden'
    }}>
      {/* Dim overlay for better text readability */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 0 }}></div>
      
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: '80px' }}>
        <p style={{ color: 'white', letterSpacing: '2px', fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase', marginBottom: '8px' }}>
          I'M LOCKED LOVE LETTER
        </p>
        <h1 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '8px', fontFamily: '"Playfair Display", serif', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          For Your Eyes Only
        </h1>
        <p style={{ color: 'white', fontSize: '0.9rem', opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          Warning tone played - Enter the 4-digit pin
        </p>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }} className={errorShake ? 'shake' : ''}>
        <div className="heart-lock-wrapper">
          <div className={`heart-lock-shackle ${isUnlocked ? 'unlocked' : ''}`}></div>
          <div className="heart-lock-shape"></div>
          
          <div className="heart-lock-content">
            {/* The 4 slot inputs */}
            <div style={{ display: 'flex', gap: '10px', padding: '0 10px', zIndex: 20 }}>
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index}
                  style={{
                    width: '46px',
                    height: '92px',
                    backgroundColor: '#fffdfd',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-evenly',
                    padding: '4px 0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15), inset 0 -2px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  <button 
                    onClick={() => incrementDigit(index)}
                    className="pin-control-btn"
                  >
                    +
                  </button>
                  
                  <div style={{
                    fontWeight: 'bold',
                    fontSize: '1.7rem',
                    color: '#2d3436',
                    fontFamily: 'monospace',
                    lineHeight: '1'
                  }}>
                    {digits[index]}
                  </div>

                  <button 
                    onClick={() => decrementDigit(index)}
                    className="pin-control-btn"
                  >
                    -
                  </button>
                </div>
              ))}
            </div>

            <button 
              onClick={handleEnter}
              className="heart-enter-btn"
            >
              ENTER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinScreen;
