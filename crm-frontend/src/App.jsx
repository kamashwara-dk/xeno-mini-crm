import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import HomePage            from './pages/HomePage';
import CampaignPage        from './pages/CampaignPage';
import CampaignsListPage   from './pages/CampaignsListPage';
import CustomersPage       from './pages/CustomersPage';

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur bg-slate-950/80 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2">
        <span className="text-violet-400 font-bold text-lg">Xeno</span>
        <span className="text-slate-500 text-sm">Mini CRM</span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-6 text-sm">
        <NavLink
          to="/campaigns"
          className={({ isActive }) =>
            isActive ? 'text-white font-medium' : 'text-slate-500 hover:text-slate-300 transition-colors'
          }
        >
          Campaigns
        </NavLink>
        <NavLink
          to="/customers"
          className={({ isActive }) =>
            isActive ? 'text-white font-medium' : 'text-slate-500 hover:text-slate-300 transition-colors'
          }
        >
          Customers
        </NavLink>
        <Link to="/" className="btn-primary !px-3 !py-1.5 text-xs">
          + New
        </Link>
      </div>
    </nav>
  );
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
      <p className="text-6xl mb-6">🔍</p>
      <h1 className="text-2xl font-bold text-slate-100 mb-3">Page not found</h1>
      <p className="text-slate-500 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Go home</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          <Route path="/"               element={<HomePage />} />
          <Route path="/campaigns"      element={<CampaignsListPage />} />
          <Route path="/campaigns/:id"  element={<CampaignPage />} />
          <Route path="/customers"      element={<CustomersPage />} />
          <Route path="*"               element={<NotFoundPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
