import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 10;

const Dashboard = ({ isAuthenticated }) => {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchCryptos = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/crypto/top');
        if (!response.ok) throw new Error('Server error');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid data format');
        setCryptos(data.slice(0, 10));
        setError('');
      } catch (err) {
        setError('Failed to fetch cryptocurrency data');
        setCryptos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCryptos();
    const interval = setInterval(fetchCryptos, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const totalPages = Math.ceil(cryptos.length / PAGE_SIZE);
  const paginatedCryptos = Array.isArray(cryptos) ? cryptos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cryptocurrency List */}
        <div className="bg-white rounded-lg shadow-lg p-6 dark:bg-gray-800">
          <h2 className="text-2xl font-bold mb-4 text-blue-700 font-orbitron">Top Cryptocurrencies</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="px-4 py-2 text-left">Rank</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-right">24h Change</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCryptos.map((crypto) => (
                  <tr key={crypto.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-4 py-2">{crypto.market_cap_rank}</td>
                    <td className="px-4 py-2">
                      <Link to={`/crypto/${crypto.id}`} className="flex items-center gap-2 font-semibold text-blue-700 hover:underline">
                        <img
                          src={crypto.image}
                          alt={crypto.name}
                          className="w-6 h-6 mr-2 rounded-full border border-blue-300"
                        />
                        <span>{crypto.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right">
                      ${crypto.current_price.toLocaleString()}
                    </td>
                    <td className={`px-4 py-2 text-right ${
                      crypto.price_change_percentage_24h >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {crypto.price_change_percentage_24h.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={handlePrev}
              disabled={page === 1}
              className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 transition disabled:opacity-50"
            >
              Prev
            </button>
            <span className="font-semibold text-blue-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={handleNext}
              disabled={page === totalPages}
              className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 transition disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="bg-white rounded-lg shadow-lg p-6 dark:bg-gray-800">
          <h2 className="text-2xl font-bold mb-4 text-blue-700 font-orbitron">Portfolio Overview</h2>
          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">Total Value</h3>
                  <p className="text-2xl font-bold">$0.00</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">24h Change</h3>
                  <p className="text-2xl font-bold text-green-600">+0.00%</p>
                </div>
              </div>
              <Link
                to="/portfolio"
                className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-bold"
              >
                View Portfolio
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Sign in to view your portfolio</p>
              <Link
                to="/login"
                className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-bold"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 