import React, { useState } from 'react';
import { Copy, Link as LinkIcon, Heart } from 'lucide-react';

const CreatorPage = () => {
  const [formData, setFormData] = useState({
    pin: '',
    title: 'To Kurt',
    message: '',
    musicLink: '',
    photos: '' // Comma separated URLs
  });
  const [generatedLink, setGeneratedLink] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    // PIN constraint: numbers only, max length 4
    if (name === 'pin') {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 4) return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    if (formData.pin.length !== 4) {
      alert("PIN must be exactly 4 digits.");
      return;
    }
    
    // Parse photos string into an array of URLs
    const photosArray = formData.photos
      .split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    const payload = {
      ...formData,
      photos: photosArray
    };

    try {
      // Create Base64 hash
      const jsonString = JSON.stringify(payload);
      const base64Data = btoa(unescape(encodeURIComponent(jsonString))); // Handle unicode characters
      
      const baseUrl = window.location.origin;
      const finalUrl = `${baseUrl}/letter?data=${base64Data}`;
      
      setGeneratedLink(finalUrl);
    } catch (err) {
      console.error("Error generating link", err);
      alert("Failed to generate link. Make sure URLs are well-formed.");
    }
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Heart color="var(--primary)" fill="var(--primary)" />
          Love Lock Creator
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Create your PIN-protected love letter and share the link.</p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <label htmlFor="pin">4-Digit PIN Code *</label>
            <input
              type="text"
              id="pin"
              name="pin"
              className="input-field"
              placeholder="e.g. 1234"
              value={formData.pin}
              onChange={handleChange}
              required
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
              The recipient will need this code to unlock your letter.
            </small>
          </div>

          <div>
            <label htmlFor="title">Letter Title</label>
            <input
              type="text"
              id="title"
              name="title"
              className="input-field"
              placeholder="e.g. To Kurt"
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="message">Your Message *</label>
            <textarea
              id="message"
              name="message"
              className="input-field"
              placeholder="Type your lovely message here..."
              value={formData.message}
              onChange={handleChange}
              rows="6"
              required
            />
          </div>

          <div>
            <label htmlFor="musicLink">YouTube Music Link (Optional)</label>
            <input
              type="url"
              id="musicLink"
              name="musicLink"
              className="input-field"
              placeholder="e.g. https://www.youtube.com/watch?v=..."
              value={formData.musicLink}
              onChange={handleChange}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
              We'll embed this to play when they read the letter.
            </small>
          </div>

          <div>
            <label htmlFor="photos">Photo URLs (Optional)</label>
            <textarea
              id="photos"
              name="photos"
              className="input-field"
              placeholder="Paste image URLs separated by commas (e.g. https://example.com/img1.jpg, https://example.com/img2.jpg)"
              value={formData.photos}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
            <LinkIcon size={20} />
            Generate Secret Link
          </button>
        </form>

        {generatedLink && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255, 107, 129, 0.05)', borderRadius: '8px', border: '1px dashed var(--primary)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', fontFamily: 'Inter' }}>Your Link is Ready!</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="input-field" 
                value={generatedLink} 
                readOnly 
                style={{ background: 'white' }}
              />
              <button 
                type="button" 
                className="btn-primary" 
                onClick={copyToClipboard}
                style={{ padding: '0 16px', minWidth: 'auto' }}
              >
                <Copy size={20} />
              </button>
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Send this link to your special someone. They'll need the PIN <strong>{formData.pin}</strong> to unlock it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorPage;
