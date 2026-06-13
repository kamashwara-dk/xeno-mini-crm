import { useState, useRef } from 'react';
import { submitBrief } from '../api/client';
import AudiencePreview from '../components/AudiencePreview';

const EXAMPLE_BRIEFS = [
  "Re-engage customers who haven't bought in 60 days but spent over ₹5000. Send a WhatsApp message about our summer collection.",
  "VIP customers who've placed 5 or more orders — send an exclusive WhatsApp offer for early access.",
  "Customers who bought kurtas and haven't reordered in 45 days — SMS reminder about matching accessories.",
  "Everyone who spent over ₹10,000 — email about our loyalty rewards program.",
];

export default function HomePage() {
  const [brief,       setBrief]       = useState('');
  const [uiState,     setUiState]     = useState('idle'); // idle | loading | preview | error
  const [briefResult, setBriefResult] = useState(null);
  const [error,       setError]       = useState(null);
  const textareaRef = useRef(null);

  const handleSubmit = async () => {
    if (!brief.trim() || uiState === 'loading') return;
    setUiState('loading');
    setError(null);
    try {
      const result = await submitBrief(brief.trim());
      setBriefResult(result);
      setUiState('preview');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong');
      setUiState('error');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
  };

  const handleEditBrief = () => {
    setUiState('idle');
    setBriefResult(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const isLoading = uiState === 'loading';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {uiState === 'preview' && briefResult && (
        <>
          <div className="card mb-4 text-sm text-slate-400 italic">
            "{brief}"
          </div>
          <AudiencePreview
            briefResult={briefResult}
            onEditBrief={handleEditBrief}
          />
        </>
      )}

      {uiState !== 'preview' && (
        <>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">New Campaign</h2>
          <p className="text-slate-400 mb-6">
            Describe your audience and goal in plain English. AI handles the rest.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {EXAMPLE_BRIEFS.map((b, i) => (
              <button
                key={i}
                onClick={() => { setBrief(b); textareaRef.current?.focus(); }}
                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700
                           text-slate-300 px-3 py-1.5 rounded-full transition-colors text-left"
              >
                {b.length > 55 ? b.slice(0, 55) + '…' : b}
              </button>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            rows={5}
            value={brief}
            onChange={(e) => { setBrief(e.target.value); if (uiState === 'error') setUiState('idle'); }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="e.g. Re-engage customers who haven't bought in 60 days but spent over ₹5000..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3
                       text-slate-100 placeholder-slate-600 text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-violet-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {uiState === 'error' && error && (
            <div className="mt-3 bg-red-900/30 border border-red-800 text-red-400 text-sm
                            rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!brief.trim() || isLoading}
              className="btn-primary flex items-center gap-2"
            >
              {isLoading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isLoading ? 'AI is analysing your brief…' : 'Run Campaign with AI →'}
            </button>
            <span className="text-xs text-slate-600">Ctrl+Enter to submit</span>
          </div>
        </>
      )}
    </div>
  );
}
