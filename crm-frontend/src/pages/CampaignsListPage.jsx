import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCampaigns } from '../api/client';
import ChannelBadge from '../components/ChannelBadge';

function StatusBadge({ status }) {
  if (status === 'sending') {
    return (
      <span className="badge bg-emerald-900 border border-emerald-700 text-emerald-300">
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
        Sending
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="badge bg-slate-800 border border-slate-700 text-slate-400">
        Completed
      </span>
    );
  }
  return (
    <span className="badge bg-slate-800 border border-slate-700 text-slate-500">
      Draft
    </span>
  );
}

function MiniProgressBar({ delivered, sent, audienceSize }) {
  const base = sent || audienceSize || 1;
  const pct  = Math.min(100, Math.round((delivered / base) * 100));
  return (
    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
      <div
        className="h-1.5 bg-emerald-500 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    getCampaigns()
      .then(setCampaigns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <span className="w-6 h-6 border-2 border-slate-600 border-t-violet-500 rounded-full animate-spin mr-3" />
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Campaigns</h2>
          <p className="text-sm text-slate-500 mt-0.5">{campaigns.length} total</p>
        </div>
        <Link to="/" className="btn-primary text-sm">+ New Campaign</Link>
      </div>

      {/* Empty state */}
      {campaigns.length === 0 && (
        <div className="card text-center py-16">
          <p className="text-slate-500 mb-4">No campaigns yet.</p>
          <Link to="/" className="btn-primary text-sm">Create your first campaign</Link>
        </div>
      )}

      {/* Campaign cards */}
      <div className="space-y-3">
        {campaigns.map((c) => (
          <Link
            key={c.id}
            to={`/campaigns/${c.id}`}
            className="card block hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-100 truncate">{c.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatDate(c.sent_at || c.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ChannelBadge channel={c.channel} />
                <StatusBadge status={c.status} />
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span>{c.audience_size ?? 0} customers</span>
              <span>{c.stat_delivered ?? 0} delivered</span>
              <span>{c.stat_clicked  ?? 0} clicked</span>
              <span>{c.stat_ordered  ?? 0} orders</span>
            </div>

            <MiniProgressBar
              delivered={c.stat_delivered}
              sent={c.stat_sent}
              audienceSize={c.audience_size}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
