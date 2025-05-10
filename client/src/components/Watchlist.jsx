import { useState, useEffect } from 'react';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [cryptoDetails, setCryptoDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCoinId, setNewCoinId] = useState('');

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/crypto/watchlist', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setWatchlist(data);
      
      // Fetch details for each coin in watchlist
      const details = {};
      for (const item of data) {
        if (!item.coinId) continue; // skip invalid entries
        const detailResponse = await fetch(`http://localhost:5000/api/crypto/${item.coinId}`);
        const detailData = await detailResponse.json();
        details[item.coinId] = detailData;
      }
      setCryptoDetails(details);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch watchlist');
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/crypto/watchlist/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ coinId: newCoinId })
      });

      if (!response.ok) {
        throw new Error('Failed to add to watchlist');
      }

      setNewCoinId('');
      fetchWatchlist();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async (coinId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/crypto/watchlist/remove/${coinId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove from watchlist');
      }

      fetchWatchlist();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Watchlist</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Add to Watchlist Form */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Add to Watchlist</h2>
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="text"
            value={newCoinId}
            onChange={(e) => setNewCoinId(e.target.value)}
            placeholder="Enter coin ID (e.g., bitcoin)"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
          >
            Add
          </button>
        </form>
      </div>

      {/* Watchlist Table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Watched Cryptocurrencies</h2>
        {Array.isArray(watchlist) && watchlist.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No cryptocurrencies in your watchlist yet</p>
        ) : Array.isArray(watchlist) ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Coin</th>
                  <th className="px-4 py-2 text-right">Current Price</th>
                  <th className="px-4 py-2 text-right">24h Change</th>
                  <th className="px-4 py-2 text-right">Market Cap</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((item) => {
                  const details = cryptoDetails[item.coinId];
                  return (
                    <tr key={item.coinId} className="border-b">
                      <td className="px-4 py-2">
                        <div className="flex items-center">
                          <img
                            src={details?.image?.small}
                            alt={details?.name}
                            className="w-6 h-6 mr-2"
                          />
                          <span>{details?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        ${details?.market_data?.current_price?.usd?.toLocaleString()}
                      </td>
                      <td className={`px-4 py-2 text-right ${
                        details?.market_data?.price_change_percentage_24h >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {details?.market_data?.price_change_percentage_24h?.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2 text-right">
                        ${details?.market_data?.market_cap?.usd?.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleRemove(item.coinId)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Watchlist; 