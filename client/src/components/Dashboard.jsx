import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 12;

const Dashboard = ({ isAuthenticated }) => {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCryptos, setFilteredCryptos] = useState([]);
  const [topGainers, setTopGainers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [stats, setStats] = useState({ totalMarketCap: 0, totalVolume: 0, avgChange24h: 0 });

  useEffect(() => {
    const fetchCryptos = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/crypto/top');
        const data = await response.json();
        
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error(`Rate limit exceeded. Please try again in ${data.retryAfter || 60} seconds.`);
          } else {
            throw new Error(data.message || 'Server error');
          }
        }
        
        if (!Array.isArray(data)) throw new Error('Invalid data format');
        // Keep more coins for better UI sections
        const topList = data.slice(0, 50);
        setCryptos(topList);
        setFilteredCryptos(topList);

        // Compute gainers/losers
        const sortedByChange = [...topList].filter(c => typeof c.price_change_percentage_24h === 'number');
        sortedByChange.sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0));
        setTopGainers(sortedByChange.slice(0, 5));
        const losers = [...sortedByChange].reverse();
        setTopLosers(losers.slice(0, 5));

        // Compute stats
        const totalMarketCap = topList.reduce((sum, c) => sum + (c.market_cap || 0), 0);
        const totalVolume = topList.reduce((sum, c) => sum + (c.total_volume || 0), 0);
        const avgChange24h = topList.length
          ? topList.reduce((sum, c) => sum + (c.price_change_percentage_24h || 0), 0) / topList.length
          : 0;
        setStats({ totalMarketCap, totalVolume, avgChange24h });

        setError('');
      } catch (err) {
        setError(err.message);
        setCryptos([]);
        setFilteredCryptos([]);
        setTopGainers([]);
        setTopLosers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCryptos();
    const interval = setInterval(fetchCryptos, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Filter cryptocurrencies based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCryptos(cryptos);
      setPage(1);
    } else {
      const filtered = cryptos.filter(crypto => 
        crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crypto.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCryptos(filtered);
      setPage(1);
    }
  }, [searchTerm, cryptos]);

  // Add error handling for authentication
  // Dashboard should be visible even when not authenticated

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 mt-8">
        {error}
      </div>
    );
  }

  const formatCurrency = (n) =>
    typeof n === 'number'
      ? n >= 1_000_000_000
        ? `$${(n / 1_000_000_000).toFixed(2)}B`
        : n >= 1_000_000
        ? `$${(n / 1_000_000).toFixed(2)}M`
        : `$${n.toLocaleString()}`
      : '$0';

  const gridItems = Array.isArray(filteredCryptos)
    ? filteredCryptos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track top cryptocurrencies, trends, and market stats in real-time.
        </p>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Market Cap (Top 50)</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{formatCurrency(stats.totalMarketCap)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">24h Volume (Top 50)</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{formatCurrency(stats.totalVolume)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Average 24h Change</p>
          <p className={`text-2xl font-bold mt-1 ${stats.avgChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.avgChange24h.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Gainers / Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Top Gainers (24h)</h2>
          <div className="space-y-3">
            {topGainers.map((c) => (
              <Link key={c.id} to={`/crypto/${c.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <div className="flex items-center gap-3">
                  <img src={c.image} alt={c.name} className="w-7 h-7 rounded-full" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{c.symbol.toUpperCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">${c.current_price.toLocaleString()}</p>
                  <p className="text-sm font-semibold text-green-600">+{c.price_change_percentage_24h.toFixed(2)}%</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Top Losers (24h)</h2>
          <div className="space-y-3">
            {topLosers.map((c) => (
              <Link key={c.id} to={`/crypto/${c.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <div className="flex items-center gap-3">
                  <img src={c.image} alt={c.name} className="w-7 h-7 rounded-full" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{c.symbol.toUpperCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">${c.current_price.toLocaleString()}</p>
                  <p className="text-sm font-semibold text-red-600">{c.price_change_percentage_24h.toFixed(2)}%</p>
                </div>
                      </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-xl">
          <input
            type="text"
            placeholder="Search cryptocurrencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Showing {filteredCryptos.length} of {cryptos.length}
          </p>
        )}
        </div>

      {/* Crypto Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {gridItems.map((c) => (
          <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full" />
                <div>
                  <Link to={`/crypto/${c.id}`} className="font-semibold text-gray-900 dark:text-white hover:underline">
                    {c.name}
                  </Link>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{c.symbol.toUpperCase()}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${c.price_change_percentage_24h >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {c.price_change_percentage_24h?.toFixed(2)}%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">${c.current_price.toLocaleString()}</p>
              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Market Cap</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(c.market_cap)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Volume (24h)</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(c.total_volume)}</p>
                </div>
              </div>
              <Link
                to={`/crypto/${c.id}`}
                className="mt-5 inline-flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {gridItems.length > 0 && (
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition disabled:opacity-50"
          >
            Prev
          </button>
          <span className="font-semibold text-blue-700">Page {page} of {Math.ceil(filteredCryptos.length / PAGE_SIZE) || 1}</span>
          <button
            onClick={() => setPage((p) => Math.min(Math.ceil(filteredCryptos.length / PAGE_SIZE) || 1, p + 1))}
            disabled={page >= Math.ceil(filteredCryptos.length / PAGE_SIZE)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 