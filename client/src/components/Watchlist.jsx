import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [cryptoDetails, setCryptoDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCoinId, setNewCoinId] = useState('');
  const [addingCoin, setAddingCoin] = useState(false);
  const [coinSuggestions, setCoinSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allCoins, setAllCoins] = useState([]);

  useEffect(() => {
    fetchWatchlist();
    fetchAllCoins();
  }, []);

  const fetchAllCoins = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/crypto/top');
      if (response.ok) {
        const data = await response.json();
        setAllCoins(data);
      }
    } catch (err) {
      console.error('Failed to fetch coins for suggestions:', err);
    }
  };

  const handleCoinInputChange = (e) => {
    const value = e.target.value;
    setNewCoinId(value);
    
    if (value.trim().length > 0) {
      const filtered = allCoins.filter(coin => 
        coin.name.toLowerCase().includes(value.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(value.toLowerCase()) ||
        coin.id.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8); // Limit to 8 suggestions
      setCoinSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setCoinSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectCoinSuggestion = (coin) => {
    setNewCoinId(coin.id);
    setShowSuggestions(false);
    setCoinSuggestions([]);
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('.coin-input-container')) {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchWatchlist = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/crypto/watchlist', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch watchlist');
      }

      const data = await response.json();
      console.log('Watchlist data received:', data); // Debug log
      setWatchlist(data);
      
      // Fetch details for each coin in watchlist
      const details = {};
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (!item.coinId) {
          console.log('Skipping invalid item:', item); // Debug log
          continue; // skip invalid entries
        }
        
        try {
          console.log(`Fetching details for ${item.coinId}...`); // Debug log
          const detailResponse = await fetch(`http://localhost:5000/api/crypto/${item.coinId}`);
          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            details[item.coinId] = detailData;
            console.log(`Successfully fetched details for ${item.coinId}`); // Debug log
          } else if (detailResponse.status === 429) {
            console.log('Rate limited, stopping fetch'); // Debug log
            break; // Stop fetching if rate limited
          } else {
            console.log(`Failed to fetch details for ${item.coinId}:`, detailResponse.status); // Debug log
          }
        } catch (err) {
          console.error(`Error fetching details for ${item.coinId}:`, err); // Debug log
          // Silently continue if individual coin fails
        }
        
        // Add 1 second delay between API calls to avoid rate limiting
        if (i < data.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('Final crypto details:', details); // Debug log
      setCryptoDetails(details);
      setLoading(false);
    } catch (err) {
      console.error('Watchlist fetch error:', err); // Debug log
      setError('Failed to fetch watchlist: ' + err.message);
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCoinId.trim()) return;
    
    setAddingCoin(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      console.log('Adding coin to watchlist:', newCoinId.trim().toLowerCase()); // Debug log
      
      const response = await fetch('http://localhost:5000/api/crypto/watchlist/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ coinId: newCoinId.trim().toLowerCase() })
      });

      console.log('Add response status:', response.status); // Debug log

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.message || 'Failed to add to watchlist';
        
        // Add suggestion if available
        if (errorData.suggestion) {
          errorMessage += ` ${errorData.suggestion}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Add response result:', result); // Debug log

      setNewCoinId('');
      console.log('Refreshing watchlist...'); // Debug log
      await fetchWatchlist();
    } catch (err) {
      console.error('Add to watchlist error:', err); // Debug log
      setError(err.message);
    } finally {
      setAddingCoin(false);
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

      await fetchWatchlist();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const formatMarketCap = (marketCap) => {
    if (!marketCap) return '$0';
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return formatPrice(marketCap);
  };

  const formatPercentage = (percentage) => {
    if (!percentage && percentage !== 0) return '0.00%';
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Loading your watchlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-6">
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            My Watchlist
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Track your favorite cryptocurrencies and stay updated with real-time market data
          </p>
        </div>

        {/* Add to Watchlist Form */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl shadow-xl p-8 mb-8 border border-blue-200 dark:border-blue-800">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Add New Coin</h2>
            <p className="text-gray-600 dark:text-gray-400">Search and add cryptocurrencies to your watchlist</p>
          </div>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
            <div className="coin-input-container flex-1 relative">
              <input
                type="text"
                value={newCoinId}
                onChange={handleCoinInputChange}
                onFocus={() => newCoinId.trim().length > 0 && setShowSuggestions(true)}
                placeholder="Start typing coin name..."
                className="w-full px-6 py-4 rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg shadow-sm"
                required
              />
              
              {/* Coin Suggestions Dropdown */}
              {showSuggestions && coinSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-700 border-2 border-blue-200 dark:border-blue-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {coinSuggestions.map((coin) => (
                    <button
                      key={coin.id}
                      type="button"
                      onClick={() => selectCoinSuggestion(coin)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150 border-b border-blue-100 dark:border-blue-800 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{coin.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{coin.symbol.toUpperCase()} • ${coin.current_price?.toLocaleString()}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={addingCoin || !newCoinId.trim()}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg border-0"
            >
              {addingCoin ? (
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Adding...
                </div>
              ) : (
                'Add to Watchlist'
              )}
            </button>
          </form>
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💡 Tip: Use lowercase coin IDs like "bitcoin", "ethereum", or "cardano"
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Common abbreviations: btc (bitcoin), eth (ethereum), ada (cardano), dot (polkadot)
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-8">
            <div className="flex items-center">
              <div className="w-5 h-5 bg-red-500 rounded-full mr-3"></div>
              <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Debug Information */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-8">
          <h3 className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">Debug Info:</h3>
          <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <p>Watchlist items: {watchlist.length}</p>
            <p>Crypto details loaded: {Object.keys(cryptoDetails).length}</p>
            <p>Watchlist data: {JSON.stringify(watchlist, null, 2)}</p>
            <p>Crypto details keys: {Object.keys(cryptoDetails).join(', ')}</p>
          </div>
        </div>

        {/* Watchlist Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Watched Cryptocurrencies
            </h2>
            <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
              {watchlist.length} coins
            </span>
          </div>

          {Array.isArray(watchlist) && watchlist.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Your watchlist is empty</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Start building your watchlist by adding cryptocurrencies you want to track
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {watchlist.map((item) => {
                const details = cryptoDetails[item.coinId];
                if (!details) return null;

                const priceChange = details.market_data?.price_change_percentage_24h || 0;
                const currentPrice = details.market_data?.current_price?.usd || 0;
                const marketCap = details.market_data?.market_cap?.usd || 0;

                return (
                  <div
                    key={item.coinId}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transform hover:-translate-y-1"
                  >
                    {/* Coin Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <img
                            src={details.image?.small || details.image?.thumb}
                            alt={details.name}
                            className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-gray-600"
                          />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{details.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-medium">{details.symbol}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(item.coinId)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 hover:scale-110"
                        title="Remove from watchlist"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Current Price - Large and Prominent */}
                    <div className="mb-6 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Current Price</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(currentPrice)}
                      </p>
                    </div>

                    {/* Price Information Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">24h Change</span>
                        <span className={`text-lg font-bold ${
                          priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(priceChange)}
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Market Cap</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatMarketCap(marketCap)}
                        </span>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                      <Link
                        to={`/crypto/${item.coinId}`}
                        className="block w-full text-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Watchlist; 