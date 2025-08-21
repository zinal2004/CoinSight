import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    coinId: '',
    amount: '',
    purchasePrice: ''
  });
  const [addingCoin, setAddingCoin] = useState(false);
  const [cryptoDetails, setCryptoDetails] = useState({});
  const [coinSuggestions, setCoinSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allCoins, setAllCoins] = useState([]);

  useEffect(() => {
    fetchPortfolio();
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
    setFormData({ ...formData, coinId: value });
    
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
    setFormData({ ...formData, coinId: coin.id });
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

  const fetchPortfolio = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/portfolio', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch portfolio');
      }
      
      const data = await response.json();
      setPortfolio(data);
      
      // Fetch current prices for portfolio calculation
      if (data.length > 0) {
        await fetchCurrentPrices(data);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to fetch portfolio');
      setLoading(false);
    }
  };

  const fetchCurrentPrices = async (portfolioData) => {
    const details = {};
    // Add delay between API calls to avoid rate limiting
    for (let i = 0; i < portfolioData.length; i++) {
      const holding = portfolioData[i];
      if (!holding.coinId) continue;
      
      try {
        const response = await fetch(`http://localhost:5000/api/crypto/${holding.coinId}`);
        if (response.ok) {
          const data = await response.json();
          details[holding.coinId] = data;
        } else if (response.status === 429) {
          break; // Stop fetching if rate limited
        }
      } catch (err) {
        // Silently continue if individual coin fails
      }
      
      // Add 1 second delay between API calls
      if (i < portfolioData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    setCryptoDetails(details);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    const purchasePrice = parseFloat(formData.purchasePrice);
    
    if (!formData.coinId || isNaN(amount) || amount <= 0 || isNaN(purchasePrice) || purchasePrice <= 0) {
      setError('Please enter valid values for all fields.');
      return;
    }
    
    setAddingCoin(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/portfolio/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          coinId: formData.coinId.trim().toLowerCase(),
          amount,
          purchasePrice
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.message || 'Failed to add to portfolio';
        
        // Add suggestion if available
        if (errorData.suggestion) {
          errorMessage += ` ${errorData.suggestion}`;
        }
        
        throw new Error(errorMessage);
      }

      setFormData({ coinId: '', amount: '', purchasePrice: '' });
      await fetchPortfolio();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingCoin(false);
    }
  };

  const handleRemove = async (index) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/portfolio/remove/${index}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove from portfolio');
      }

      await fetchPortfolio();
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

  const formatPercentage = (percentage) => {
    if (!percentage && percentage !== 0) return '0.00%';
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const calculatePortfolioStats = () => {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalGainLoss = 0;

    portfolio.forEach(holding => {
      const details = cryptoDetails[holding.coinId];
      if (details) {
        const currentPrice = details.market_data?.current_price?.usd || 0;
        const invested = holding.amount * holding.purchasePrice;
        const currentValue = holding.amount * currentPrice;
        const gainLoss = currentValue - invested;

        totalInvested += invested;
        totalCurrentValue += currentValue;
        totalGainLoss += gainLoss;
      }
    });

    const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue,
      totalGainLoss,
      totalGainLossPercentage
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  const portfolioStats = calculatePortfolioStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            My Portfolio
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Track your cryptocurrency investments and monitor your portfolio performance
          </p>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Invested</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(portfolioStats.totalInvested)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(portfolioStats.totalCurrentValue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Gain/Loss</p>
                <p className={`text-2xl font-bold ${
                  portfolioStats.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPrice(portfolioStats.totalGainLoss)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                portfolioStats.totalGainLoss >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
              }`}>
                <svg className={`w-6 h-6 ${
                  portfolioStats.totalGainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Performance</p>
                <p className={`text-2xl font-bold ${
                  portfolioStats.totalGainLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(portfolioStats.totalGainLossPercentage)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                portfolioStats.totalGainLossPercentage >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
              }`}>
                <svg className={`w-6 h-6 ${
                  portfolioStats.totalGainLossPercentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

      {/* Add to Portfolio Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add New Investment</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="coin-input-container relative">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Coin ID
              </label>
            <input
              type="text"
              name="coinId"
              value={formData.coinId}
                onChange={handleCoinInputChange}
                onFocus={() => formData.coinId.trim().length > 0 && setShowSuggestions(true)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Start typing coin name..."
              required
            />
              
              {/* Coin Suggestions Dropdown */}
              {showSuggestions && coinSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {coinSuggestions.map((coin) => (
                    <button
                      key={coin.id}
                      type="button"
                      onClick={() => selectCoinSuggestion(coin)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {coin.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {coin.symbol.toUpperCase()} • ${coin.current_price?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </div>
          <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="0.00"
              required
              step="any"
                min="0"
            />
          </div>
          <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Purchase Price (USD)
              </label>
            <input
              type="number"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="0.00"
              required
              step="any"
                min="0"
            />
          </div>
            <div className="md:col-span-3">
          <button
            type="submit"
                disabled={addingCoin || !formData.coinId || !formData.amount || !formData.purchasePrice}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
              >
                {addingCoin ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Adding to Portfolio...
                  </div>
                ) : (
                  'Add to Portfolio'
                )}
          </button>
            </div>
        </form>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tip: Use lowercase coin IDs like "bitcoin", "ethereum", or "cardano"
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
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

        {/* Portfolio Holdings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Portfolio Holdings
            </h2>
            <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
              {portfolio.length} holdings
            </span>
      </div>

        {portfolio.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Your portfolio is empty</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Start building your portfolio by adding your first cryptocurrency investment
              </p>
            </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Coin</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Purchase Price</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Current Price</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Total Value</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Gain/Loss</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {portfolio.slice().reverse().map((holding, index) => {
                    const originalIndex = portfolio.length - 1 - index;
                    const details = cryptoDetails[holding.coinId];
                    const currentPrice = details?.market_data?.current_price?.usd || 0;
                    const currentValue = holding.amount * currentPrice;
                    const investedValue = holding.amount * holding.purchasePrice;
                    const gainLoss = currentValue - investedValue;
                    const gainLossPercentage = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;

                    return (
                      <tr key={`${holding.coinId}-${originalIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={details?.image?.small || details?.image?.thumb}
                              alt={details?.name || holding.coinId}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {details?.name || holding.coinId}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 uppercase">
                                {details?.symbol || holding.coinId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                          {holding.amount.toFixed(6)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                          {formatPrice(holding.purchasePrice)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                          {formatPrice(currentPrice)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                          {formatPrice(currentValue)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${
                              gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatPrice(gainLoss)}
                            </p>
                            <p className={`text-xs ${
                              gainLossPercentage >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {formatPercentage(gainLossPercentage)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemove(originalIndex)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors duration-200"
                            title="Remove from portfolio"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Portfolio; 