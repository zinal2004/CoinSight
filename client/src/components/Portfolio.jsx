import { useState, useEffect } from 'react';

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    coinId: '',
    amount: '',
    purchasePrice: ''
  });

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/portfolio', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setPortfolio(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch portfolio');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    const purchasePrice = parseFloat(formData.purchasePrice);
    if (!formData.coinId || isNaN(amount) || amount <= 0 || isNaN(purchasePrice) || purchasePrice <= 0) {
      setError('Please enter valid values for all fields.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/portfolio/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          coinId: formData.coinId,
          amount,
          purchasePrice
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add to portfolio');
      }

      setFormData({ coinId: '', amount: '', purchasePrice: '' });
      fetchPortfolio();
    } catch (err) {
      setError(err.message);
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

      fetchPortfolio();
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
      <h1 className="text-3xl font-bold mb-8">My Portfolio</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Add to Portfolio Form */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Add to Portfolio</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Coin ID</label>
            <input
              type="text"
              name="coinId"
              value={formData.coinId}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
              step="any"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Purchase Price (USD)</label>
            <input
              type="number"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
              step="any"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
          >
            Add to Portfolio
          </button>
        </form>
      </div>

      {/* Portfolio List */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Portfolio Holdings</h2>
        {portfolio.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No holdings in your portfolio yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Coin</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">Purchase Price</th>
                  <th className="px-4 py-2 text-right">Total Value</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((holding, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2">{holding.coinId}</td>
                    <td className="px-4 py-2 text-right">{holding.amount}</td>
                    <td className="px-4 py-2 text-right">
                      ${holding.purchasePrice.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      ${(holding.amount * holding.purchasePrice).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleRemove(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio; 