import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
});

// All functions unwrap { data: ... } wrapper except getCustomers which
// returns the full { data, pagination } object.

export const submitBrief = (brief) =>
  api.post('/api/campaigns/brief', { brief }).then((r) => r.data.data);

export const sendCampaign = (id) =>
  api.post(`/api/campaigns/${id}/send`).then((r) => r.data.data);

export const getCampaigns = () =>
  api.get('/api/campaigns').then((r) => r.data.data);

export const getCampaign = (id) =>
  api.get(`/api/campaigns/${id}`).then((r) => r.data.data);

export const getCampaignStats = (id) =>
  api.get(`/api/campaigns/${id}/stats`).then((r) => r.data.data);

export const getCustomers = (page = 1, search = '') =>
  api
    .get('/api/customers', { params: { page, limit: 20, search: search || undefined } })
    .then((r) => r.data); // returns { data, pagination }

export const seedData = () =>
  api.post('/api/seed').then((r) => r.data.data);
