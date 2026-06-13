import { useState } from 'react';
import ChannelBadge from './ChannelBadge';
import { sendCampaign } from '../api/client';
import { useNavigate } from 'react-router-dom';

// Deterministic avatar colours by index
const AVATAR_COLORS = [
  'bg-violet-600', 'bg-blue-600', 'bg-emerald-600',
  'bg-amber-600',  'bg-pink-600',
];

function Avatar({ name, index }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`w-8 h-8 rounded-full ${AVATAR_COLORS[index % AVATAR_COLORS.length]}
        flex items-center justify-center text-xs font-bold text-white`}
      title={name}
    >
      {initials}
    </div>
  );
}

// props: { briefResult, onEditBrief }
// briefResult shape: { campaign, audienceSize, sampleMessage, sampleCustomers, channel }
export default function AudiencePreview({ briefResult, onEditBrief }) {
  const navigate  = useNavigate();
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState(null);

  const { campaign, audienceSize, sampleMessage, sampleCustomers, channel } = briefResult;

  const handleSend = async () => {
    setSending(true);
    setSendErr(null);
    try {
      await sendCampaign(campaign.id);
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      setSendErr(err.response?.data?.error || err.message);
      setSending(false);
    }
  };

  // Zero audience state
  if (!audienceSize || audienceSize === 0) {
    return (
      <div className="card mt-4">
        <div className="bg-amber-900/40 border border-amber-700 rounded-lg p-4 text-amber-300 text-sm">
          No customers matched — try a broader brief.
        </div>
        <button onClick={onEditBrief} className="btn-secondary mt-4 text-sm">
          ← Edit Brief
        </button>
      </div>
    );
  }

  return (
    <div className="card mt-4 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">AI Interpretation</p>
          <h3 className="text-lg font-semibold text-slate-100">{campaign.name}</h3>
        </div>
        <ChannelBadge channel={channel} />
      </div>

      <div className="text-3xl font-bold text-violet-400">
        {audienceSize}{' '}
        <span className="text-base font-normal text-slate-400">customers matched</span>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">Sample Message</p>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-200 leading-relaxed max-w-md">
          {sampleMessage}
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">Audience Preview</p>
        <div className="flex items-center gap-2 flex-wrap">
          {sampleCustomers.slice(0, 5).map((c, i) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <Avatar name={c.name} index={i} />
              <span className="text-sm text-slate-300">{c.name.split(' ')[0]}</span>
            </div>
          ))}
          {audienceSize > 5 && (
            <span className="text-xs text-slate-500 ml-1">
              +{audienceSize - 5} more
            </span>
          )}
        </div>
      </div>

      {sendErr && (
        <p className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
          {sendErr}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button onClick={onEditBrief} className="btn-secondary text-sm">
          ← Edit Brief
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="btn-primary text-sm flex items-center gap-2"
        >
          {sending && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {sending ? 'Sending…' : `Send to ${audienceSize} customers →`}
        </button>
      </div>
    </div>
  );
}
