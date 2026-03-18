import { useState } from 'react';
import type { GameConfig } from '../types';
import './ShareModal.css';

interface ShareModalProps {
  code: string;
  gameConfig?: GameConfig | null;
  onClose: () => void;
  authToken?: string | null;
  userScreenName?: string;
  thumbnail?: string | null;
}

const CATEGORIES = [
  { id: 'arcade', label: '👾 Arcade', emoji: '👾' },
  { id: 'puzzle', label: '🧩 Puzzle', emoji: '🧩' },
  { id: 'adventure', label: '🗺️ Adventure', emoji: '🗺️' },
  { id: 'rpg', label: '⚔️ RPG', emoji: '⚔️' },
  { id: 'strategy', label: '🧠 Strategy', emoji: '🧠' },
  { id: 'racing', label: '🏎️ Racing', emoji: '🏎️' },
  { id: 'sports', label: '⚽ Sports', emoji: '⚽' },
  { id: 'classic', label: '🕹️ Classic', emoji: '🕹️' },
  { id: 'other', label: '🎮 Other', emoji: '🎮' },
];

export default function ShareModal({
  code,
  gameConfig,
  onClose,
  authToken,
  userScreenName,
  thumbnail,
}: ShareModalProps) {
  const [title, setTitle] = useState('');
  const creatorName = userScreenName || 'Creator';
  const [category, setCategory] = useState('arcade');
  const [isPublic, setIsPublic] = useState(false);
  const [multiplayer, setMultiplayer] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{ id: string; url: string } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!title.trim()) {
      setError('Your game needs a name! What should we call it?');
      return;
    }

    setIsSharing(true);
    setError('');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          code,
          gameConfig: gameConfig ?? null,
          creatorName: creatorName.trim() || 'Anonymous Creator',
          isPublic,
          multiplayer,
          category,
          thumbnail: thumbnail || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const fullUrl = `${window.location.origin}/play/${data.id}`;
        setShareResult({ id: data.id, url: fullUrl });
      } else {
        setError(data.error || 'Oops! Something went wrong. Try again?');
      }
    } catch (_err) {
      setError("Hmm, can't reach our servers. Check your internet and try again!");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    if (shareResult) {
      try {
        await navigator.clipboard.writeText(shareResult.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (_err) {
        // Fallback for older browsers
        const input = document.createElement('input');
        input.value = shareResult.url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Share your game">
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close dialog">
          ✕
        </button>

        {!shareResult ? (
          <>
            <div className="share-header">
              <h2>🎉 Share Your Game!</h2>
              <p>Show everyone what you made!</p>
            </div>

            <div className="share-form">
              <div className="form-group">
                <label>Name your game:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Awesome Game"
                  maxLength={50}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Arcade screen name:</label>
                <input type="text" value={creatorName} readOnly />
                <small style={{ color: '#888', fontSize: '0.75rem' }}>
                  Your game will be shared with your screen name, not your real name.
                </small>
              </div>

              <div className="form-group">
                <label>What did you make?</label>
                <div className="category-grid">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      className={`category-btn ${category === cat.id ? 'selected' : ''}`}
                      onClick={() => setCategory(cat.id)}
                      type="button"
                    >
                      <span className="cat-emoji">{cat.emoji}</span>
                      <span className="cat-label">{cat.label.split(' ').slice(1).join(' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                  <span className="checkbox-text">⭐ Add to the Arcade so others can play too!</span>
                </label>
                <p className="checkbox-hint">
                  Other kids can find and play your game. A grown-up checks it first to keep things safe.
                </p>
              </div>

              <div className="form-group checkbox-group multiplayer-option">
                <label className="checkbox-label">
                  <input type="checkbox" checked={multiplayer} onChange={(e) => setMultiplayer(e.target.checked)} />
                  <span className="checkbox-text">🎮 Enable Multiplayer - Let friends play together!</span>
                </label>
                <p className="checkbox-hint">
                  Players can create rooms with codes and play your game with friends online!
                </p>
              </div>

              {error && <div className="share-error">{error}</div>}

              <button className="share-submit-btn" onClick={handleShare} disabled={isSharing}>
                {isSharing ? '⏳ Creating link...' : '🚀 Share It!'}
              </button>
            </div>
          </>
        ) : (
          <div className="share-success">
            <div className="success-animation">🎉</div>
            <h2>🎊 Woohoo! You did it!</h2>
            <p>Here's your game's link! Share it with friends.</p>

            <div className="share-link-box">
              <input type="text" value={shareResult.url} readOnly className="share-link-input" />
              <button className="copy-btn" onClick={handleCopy}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>

            <div className="share-actions">
              <button className="action-btn primary" onClick={() => window.open(shareResult.url, '_blank')}>
                🌐 Open Link
              </button>
              <button className="action-btn secondary" onClick={onClose}>
                ✓ Done
              </button>
            </div>

            {isPublic && <p className="gallery-note">Your game is being checked — it'll show up in the Arcade soon!</p>}
          </div>
        )}
      </div>
    </div>
  );
}
