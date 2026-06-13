import { useState, useEffect, useRef } from 'react';
import { getCampaignStats } from '../api/client';

// polls GET /api/campaigns/:id/stats every 3000ms, stops when completed, clears on unmount
export default function useCampaignStats(id) {
  const [campaign, setCampaign] = useState(null);
  const [stats,    setStats]    = useState(null);
  const [status,   setStatus]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const intervalRef = useRef(null);

  const fetchStats = async () => {
    try {
      const data = await getCampaignStats(id);
      setCampaign(data);
      setStats(data.stats);
      setStatus(data.status);
      setError(null);

      if (data.status === 'completed' && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    // Fetch immediately
    fetchStats();

    // Then poll every 3s
    intervalRef.current = setInterval(fetchStats, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [id]);

  return { stats, status, campaign, loading, error };
}
