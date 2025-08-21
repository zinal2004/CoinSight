import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const CoinDetail = () => {
  const { id } = useParams();
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchCoinDetails();
  }, [id]);

  const fetchCoinDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`http://localhost:5000/api/crypto/${id}`);
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded. Please try again in ${data.retryAfter || 60} seconds.`);
        } else if (response.status === 404) {
          throw new Error(`Cryptocurrency '${id}' not found.`);
        } else {
          throw new Error(data.message || 'Failed to fetch coin details');
        }
      }
      
      setCoin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  const formatVolume = (volume) => {
    if (!volume) return '$0';
    if (volume >= 1e12) return `$${(volume / 1e12).toFixed(2)}T`;
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    return formatPrice(volume);
  };

  const formatPercentage = (percentage) => {
    if (!percentage && percentage !== 0) return '0.00%';
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Loading cryptocurrency details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading Data</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={fetchCoinDetails}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>
            <Link
              to="/dashboard"
              className="block w-full text-center bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!coin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-300">No cryptocurrency data found</p>
        </div>
      </div>
    );
  }

  const marketData = coin.market_data || {};
  const currentPrice = marketData.current_price?.usd || 0;
  const priceChange24h = marketData.price_change_percentage_24h || 0;
  const priceChange7d = marketData.price_change_percentage_7d || 0;
  const priceChange30d = marketData.price_change_percentage_30d || 0;
  const marketCap = marketData.market_cap?.usd || 0;
  const volume24h = marketData.total_volume?.usd || 0;
  const circulatingSupply = marketData.circulating_supply || 0;
  const totalSupply = marketData.total_supply || 0;
  const maxSupply = marketData.max_supply || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <img
                src={coin.image?.large || coin.image?.thumb}
                alt={coin.name}
                className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-700 shadow-lg"
              />
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {coin.name}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className="text-2xl font-semibold text-gray-600 dark:text-gray-300 uppercase">
                    {coin.symbol}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                    Rank #{coin.market_cap_rank || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {formatPrice(currentPrice)}
              </div>
              <div className={`text-lg font-semibold ${
                priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercentage(priceChange24h)} (24h)
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-1 shadow-lg">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('market')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'market'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Market Data
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'about'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              About
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                  <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Market Cap</h3>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatMarketCap(marketCap)}</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
                  <h3 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">24h Volume</h3>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatVolume(volume24h)}</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
                  <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">Circulating Supply</h3>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatNumber(circulatingSupply)}</p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-700">
                  <h3 className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">Total Supply</h3>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{formatNumber(totalSupply)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Price Performance</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">24h Change</span>
                      <span className={`font-semibold ${
                        priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(priceChange24h)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">7d Change</span>
                      <span className={`font-semibold ${
                        priceChange7d >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(priceChange7d)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">30d Change</span>
                      <span className={`font-semibold ${
                        priceChange30d >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(priceChange30d)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Supply Info</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Circulating</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(circulatingSupply)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Total</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(totalSupply)}</span>
                    </div>
                    {maxSupply > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Max</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(maxSupply)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Link
                      to="/portfolio"
                      className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Add to Portfolio
                    </Link>
                    <Link
                      to="/watchlist"
                      className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Add to Watchlist
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Market Data Tab */}
          {activeTab === 'market' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Market Statistics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Price Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Current Price</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(currentPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Market Cap</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatMarketCap(marketCap)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">24h Volume</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatVolume(volume24h)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Market Cap Rank</span>
                      <span className="font-semibold text-gray-900 dark:text-white">#{coin.market_cap_rank || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Price Changes</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">1h</span>
                      <span className={`font-semibold ${
                        (marketData.price_change_percentage_1h_in_currency?.usd || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(marketData.price_change_percentage_1h_in_currency?.usd || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">24h</span>
                      <span className={`font-semibold ${
                        priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(priceChange24h)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">7d</span>
                      <span className={`font-semibold ${
                        priceChange7d >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(priceChange7d)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">30d</span>
                      <span className={`font-semibold ${
                        priceChange30d >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(priceChange30d)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">About {coin.name}</h2>
              
              {coin.description?.en && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Description</h3>
                  <div 
                    className="text-gray-700 dark:text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: coin.description.en.replace(/\n/g, '<br>') 
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">General Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Name</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{coin.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Symbol</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{coin.symbol?.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Genesis Date</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {coin.genesis_date || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Block Time</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {coin.block_time_in_minutes ? `${coin.block_time_in_minutes} min` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Links</h3>
                  <div className="space-y-3">
                    {coin.links?.homepage?.[0] && (
                      <a
                        href={coin.links.homepage[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                      >
                        Official Website
                      </a>
                    )}
                    {coin.links?.blockchain_site?.[0] && (
                      <a
                        href={coin.links.blockchain_site[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                      >
                        Blockchain Explorer
                      </a>
                    )}
                    {coin.links?.repos_url?.github?.[0] && (
                      <a
                        href={coin.links.repos_url.github[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                      >
                        GitHub Repository
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoinDetail; 