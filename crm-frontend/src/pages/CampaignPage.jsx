import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCampaign } from '../api/client';
import useCampaignStats from '../hooks/useCampaignStats';
import ChannelBadge from '../components/ChannelBadge';
import StatCard from '../components/StatCard';

export default function CampaignPage() {
  const { id } = useParams();
  const { stats, status, campaign: statsCampaign, loading, error } = useCampaignStats(id);

  const [fullCampaign, setFullCampaign] = useState(null);

  // Fetch full campaign once on mount (for brief text)
  useEffect(() => {
    getCampaign(id).then(setFullCampaign).catch(() => {});
  }, [id]);

  const campaign    = fullCampaign || statsCampaign;
  const isLive      = status === 'sending';
  const isCompleted = status === 'completed';
  const audienceSize = campaign?.audience_size || statsCampaign?.audienceSize || 0;

  const deliveryRate = stats && (stats.sent || audienceSize)
    ? Math.round((stats.delivered / (stats.sent || audienceSize)) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <span className="w-6 h-6 border-2 border-slate-600 border-t-violet-500 rounded-full animate-spin mr-3" />
        Loading campaign…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-red-400">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      <Link to="/campaigns" className="text-sm text-slate-500 hover:text-slate-300 transition-colors mb-6 inline-block">
        ← All Campaigns
      </Link>

      <div className="flex items-start justify-between gap-4 mb-2">
        <h2 className="text-2xl font-bold text-slate-100">
          {campaign?.name || '…'}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          {campaign?.channel && <ChannelBadge channel={campaign.channel} />}
          {isLive && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
          {isCompleted && (
            <span className="text-slate-500 text-sm">Completed</span>
          )}
        </div>
      </div>

      {(fullCampaign?.brief || campaign?.brief) && (
        <p className="text-sm text-slate-500 mb-1 italic">
          "{fullCampaign?.brief || campaign?.brief}"
        </p>
      )}

      <p className="text-sm text-slate-400 mb-8">
        Sent to {audienceSize} customers
      </p>

      <div className="grid grid-cols-4 gap-3 mb-3">
        <StatCard label="Sent"      value={stats?.sent}      icon="📤" color="default" />
        <StatCard label="Delivered" value={stats?.delivered} icon="✅" color="green"   />
        <StatCard label="Failed"    value={stats?.failed}    icon="❌" color="red"     />
        <StatCard label="Opened"    value={stats?.opened}    icon="👁️" color="blue"    />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="Read"    value={stats?.read}    icon="📖" color="violet" />
        <StatCard label="Clicked" value={stats?.clicked} icon="🖱️" color="violet" />
        <StatCard label="Orders"  value={stats?.ordered} icon="🛍️" color="amber"  />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Delivery rate</span>
          <span className="text-sm font-semibold text-slate-200">{deliveryRate}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-2 bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${deliveryRate}%` }}
          />
        </div>
        {isLive && (
          <p className="text-xs text-emerald-500 mt-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Receiving delivery updates…
          </p>
        )}
      </div>
    </div>
  );
}
