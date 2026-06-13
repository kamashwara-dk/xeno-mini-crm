const CHANNEL_CONFIG = {
  whatsapp: {
    icon: '💬',
    classes: 'bg-green-900 text-green-300 border border-green-700',
  },
  sms: {
    icon: '📱',
    classes: 'bg-blue-900 text-blue-300 border border-blue-700',
  },
  email: {
    icon: '✉️',
    classes: 'bg-orange-900 text-orange-300 border border-orange-700',
  },
  rcs: {
    icon: '🔷',
    classes: 'bg-purple-900 text-purple-300 border border-purple-700',
  },
};

export default function ChannelBadge({ channel }) {
  const cfg = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.whatsapp;
  return (
    <span className={`badge ${cfg.classes}`}>
      <span>{cfg.icon}</span>
      <span className="capitalize">{channel}</span>
    </span>
  );
}
