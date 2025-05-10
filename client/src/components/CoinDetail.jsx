import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const CoinDetail = () => {
  const { id } = useParams();
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState(null);
  const [news, setNews] = useState([]);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({ amount: '', purchasePrice: '' });
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const chartContainerRef = useRef(null);
  const isAuthenticated = Boolean(localStorage.getItem('token'));

  useEffect(() => {
    const fetchCoin = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/crypto/${id}`);
        const data = await res.json();
        setCoin(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch coin data');
        setLoading(false);
      }
    };
    fetchCoin();
  }, [id]);

  useEffect(() => {
    // Fetch chart data (price history)
    const fetchChart = async () => {
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30`);
        const data = await res.json();
        setChartData({
          labels: data.prices.map(([timestamp]) => new Date(timestamp).toLocaleDateString()),
          datasets: [
            {
              label: 'Price (USD)',
              data: data.prices.map(([, price]) => price),
              borderColor: '#00ffe7',
              backgroundColor: 'rgba(0,255,231,0.1)',
              tension: 0.2,
              fill: true,
            },
          ],
        });
      } catch (err) {
        setChartData(null);
      }
    };
    fetchChart();
  }, [id]);

  useEffect(() => {
    // Placeholder for news (can be replaced with a real crypto news API)
    setNews([
      {
        title: 'Crypto market update: Major coins rally',
        url: '#',
        source: 'CryptoNews',
        published: 'Today',
      },
      {
        title: 'Regulation news: What it means for investors',
        url: '#',
        source: 'CoinJournal',
        published: 'Yesterday',
      },
    ]);
  }, [id]);

  const handleAddWatchlist = async () => {
    setActionMsg('');
    setActionError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/crypto/watchlist/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ coinId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add to watchlist');
      setActionMsg('Added to watchlist!');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleOpenPortfolioModal = () => {
    setPortfolioForm({ amount: '', purchasePrice: '' });
    setShowPortfolioModal(true);
    setActionMsg('');
    setActionError('');
  };

  const handlePortfolioChange = (e) => {
    setPortfolioForm({ ...portfolioForm, [e.target.name]: e.target.value });
  };

  const handleAddPortfolio = async (e) => {
    e.preventDefault();
    setActionMsg('');
    setActionError('');
    const amount = parseFloat(portfolioForm.amount);
    const purchasePrice = parseFloat(portfolioForm.purchasePrice);
    if (!portfolioForm.amount || isNaN(amount) || amount <= 0 || !portfolioForm.purchasePrice || isNaN(purchasePrice) || purchasePrice <= 0) {
      setActionError('Please enter valid positive numbers for amount and purchase price.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/portfolio/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          coinId: id,
          amount,
          purchasePrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add to portfolio');
      setActionMsg('Added to portfolio!');
      setShowPortfolioModal(false);
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crypto-neon"></div>
      </div>
    );
  }
  if (error || !coin) {
    return <div className="text-center text-red-600 mt-8">{error || 'Coin not found'}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start bg-white/80 dark:bg-crypto-blue/80 rounded-xl shadow-lg p-8 border border-crypto-neon mb-8">
        <img src={coin.image?.large} alt={coin.name} className="w-20 h-20 rounded-full border-4 border-crypto-neon shadow-neon" />
        <div className="flex-1">
          <h1 className="font-orbitron text-3xl font-bold text-crypto-neon mb-2">{coin.name} ({coin.symbol?.toUpperCase()})</h1>
          <p className="text-2xl font-bold mb-2">${coin.market_data?.current_price?.usd?.toLocaleString()}</p>
          <div className="flex flex-wrap gap-4 text-gray-700 dark:text-gray-200 mb-2">
            <span>Market Cap: <span className="font-semibold">${coin.market_data?.market_cap?.usd?.toLocaleString()}</span></span>
            <span>24h Change: <span className={coin.market_data?.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}>{coin.market_data?.price_change_percentage_24h?.toFixed(2)}%</span></span>
            <span>Circulating Supply: <span className="font-semibold">{coin.market_data?.circulating_supply?.toLocaleString()}</span></span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm mt-2" dangerouslySetInnerHTML={{ __html: coin.description?.en?.split('. ')[0] + '.' }} />
          {isAuthenticated && (
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleAddWatchlist}
                className="px-4 py-2 rounded-md bg-crypto-neon text-crypto-blue font-bold shadow-neon hover:bg-crypto-gold transition"
              >
                Add to Watchlist
              </button>
              <button
                onClick={handleOpenPortfolioModal}
                className="px-4 py-2 rounded-md bg-crypto-blue text-crypto-neon border border-crypto-neon font-bold shadow-neon hover:bg-crypto-neon hover:text-crypto-blue transition"
              >
                Add to Portfolio
              </button>
            </div>
          )}
          {(actionMsg || actionError) && (
            <div className={`mt-4 font-semibold ${actionMsg ? 'text-green-600' : 'text-red-500'}`}>{actionMsg || actionError}</div>
          )}
        </div>
      </div>
      {/* Portfolio Modal */}
      {showPortfolioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-crypto-blue rounded-xl shadow-xl p-8 border border-crypto-neon w-full max-w-sm">
            <h3 className="font-orbitron text-xl font-bold text-crypto-neon mb-4">Add to Portfolio</h3>
            <form onSubmit={handleAddPortfolio} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={portfolioForm.amount}
                  onChange={handlePortfolioChange}
                  required
                  min="0"
                  step="any"
                  className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-crypto-neon bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-crypto-neon focus:border-crypto-neon"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Price (USD)</label>
                <input
                  type="number"
                  name="purchasePrice"
                  value={portfolioForm.purchasePrice}
                  onChange={handlePortfolioChange}
                  required
                  min="0"
                  step="any"
                  className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-crypto-neon bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-crypto-neon focus:border-crypto-neon"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-md bg-crypto-neon text-crypto-blue font-bold shadow-neon hover:bg-crypto-gold transition"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowPortfolioModal(false)}
                  className="flex-1 px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Chart Section */}
      <div className="bg-white/80 dark:bg-crypto-blue/80 rounded-xl shadow-lg p-6 border border-crypto-neon mb-8" ref={chartContainerRef}>
        <h2 className="font-orbitron text-xl font-bold text-crypto-neon mb-4">30-Day Price Chart</h2>
        <div style={{ height: 320, width: '100%' }}>
          {chartData ? (
            <Line data={chartData} options={{
              plugins: { legend: { labels: { color: '#00ffe7' } } },
              scales: {
                x: { ticks: { color: '#00ffe7' } },
                y: { ticks: { color: '#00ffe7' } },
              },
              responsive: true,
              maintainAspectRatio: false,
            }} height={300} />
          ) : (
            <div className="text-gray-500">Chart data not available.</div>
          )}
        </div>
      </div>
      {/* News Section */}
      <div className="bg-white/80 dark:bg-crypto-blue/80 rounded-xl shadow-lg p-6 border border-crypto-neon">
        <h2 className="font-orbitron text-xl font-bold text-crypto-neon mb-4">Latest News</h2>
        <ul className="space-y-3">
          {news.map((item, idx) => (
            <li key={idx} className="border-b border-crypto-neon pb-2">
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-crypto-neon hover:underline">
                {item.title}
              </a>
              <div className="text-xs text-gray-500 mt-1">{item.source} &middot; {item.published}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CoinDetail; 