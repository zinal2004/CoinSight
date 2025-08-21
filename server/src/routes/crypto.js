const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');
const User = require('../models/User');

// Simple rate limiting
const requestCounts = {};
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // CoinGecko allows ~50 calls per minute, we'll be conservative

// Rate limiting middleware
const checkRateLimit = (req, res, next) => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  Object.keys(requestCounts).forEach(key => {
    if (requestCounts[key].timestamp < windowStart) {
      delete requestCounts[key];
    }
  });
  
  // Check if we're at the limit
  const totalRequests = Object.values(requestCounts).reduce((sum, count) => sum + count.count, 0);
  
  if (totalRequests >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      message: 'Rate limit exceeded. Please wait before making more requests.',
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - Math.min(...Object.values(requestCounts).map(c => c.timestamp)))) / 1000)
    });
  }
  
  // Track this request
  const requestId = `${now}-${Math.random()}`;
  requestCounts[requestId] = { timestamp: now, count: 1 };
  
  next();
};

// Coin ID mapping for common abbreviations
const coinIdMapping = {
  'btc': 'bitcoin',
  'eth': 'ethereum',
  'ada': 'cardano',
  'dot': 'polkadot',
  'link': 'chainlink',
  'ltc': 'litecoin',
  'xrp': 'ripple',
  'bch': 'bitcoin-cash',
  'eos': 'eos',
  'trx': 'tron'
};

// Helper function to get correct coin ID
const getCorrectCoinId = (coinId) => {
  const normalizedId = coinId.toLowerCase().trim();
  return coinIdMapping[normalizedId] || normalizedId;
};

// Get top cryptocurrencies
router.get('/top', checkRateLimit, async (req, res) => {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false',
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'CoinSight/1.0'
        }
      }
    );
    const data = response.data;
    if (!Array.isArray(data)) throw new Error('Invalid data from CoinGecko');
    res.json(data);
  } catch (err) {
    if (err.response?.status === 429) {
      const retryAfter = err.response.headers['retry-after'] || 60;
      res.status(429).json({ 
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: parseInt(retryAfter),
        error: 'Too many requests to CoinGecko API'
      });
    } else if (err.code === 'ECONNABORTED') {
      res.status(408).json({ 
        message: 'Request timeout. Please try again.',
        error: 'API request timed out'
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to fetch top cryptocurrencies', 
        error: err.message 
      });
    }
  }
});

// Get user's watchlist
router.get('/watchlist', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Defensive: only return valid entries
    res.json(Array.isArray(user.watchlist) ? user.watchlist.filter(item => item.coinId) : []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching watchlist', error: error.message });
  }
});

// Add to watchlist
router.post('/watchlist/add', auth, async (req, res) => {
  try {
    const { coinId } = req.body;
    const correctCoinId = getCorrectCoinId(coinId);
    
    // Verify the coin exists before adding to watchlist
    try {
      await axios.get(`https://api.coingecko.com/api/v3/coins/${correctCoinId}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'CoinSight/1.0'
        }
      });
    } catch (verifyError) {
      if (verifyError.response?.status === 404) {
        return res.status(400).json({ 
          message: `Cryptocurrency '${coinId}' not found. Please check the coin ID.`,
          error: 'Invalid coin ID'
        });
      }
      // If it's a rate limit or other error, still allow adding to watchlist
      console.warn(`Could not verify coin ${correctCoinId}:`, verifyError.message);
    }
    
    const user = await User.findById(req.user._id);
    if (!user.watchlist.some(item => item.coinId === correctCoinId)) {
      user.watchlist.push({ coinId: correctCoinId });
      await user.save();
    }
    res.json(user.watchlist);
  } catch (error) {
    res.status(500).json({ message: 'Error adding to watchlist', error: error.message });
  }
});

// Remove from watchlist
router.delete('/watchlist/remove/:coinId', auth, async (req, res) => {
  try {
    const { coinId } = req.params;
    const user = await User.findById(req.user._id);
    user.watchlist = user.watchlist.filter(item => item.coinId !== coinId);
    await user.save();
    res.json(user.watchlist);
  } catch (error) {
    res.status(500).json({ message: 'Error removing from watchlist', error: error.message });
  }
});

// Get cryptocurrency details
router.get('/:id', checkRateLimit, async (req, res) => {
  try {
    const correctCoinId = getCorrectCoinId(req.params.id);
    
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${correctCoinId}`, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'CoinSight/1.0'
      }
    });
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      res.status(429).json({ 
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: parseInt(retryAfter),
        error: 'Too many requests to CoinGecko API'
      });
    } else if (error.response?.status === 404) {
      res.status(404).json({ 
        message: `Cryptocurrency '${req.params.id}' not found. Try using the full name (e.g., 'ethereum' instead of 'eth').`,
        error: `Coin with ID '${req.params.id}' not found`,
        suggestion: `Did you mean '${getCorrectCoinId(req.params.id)}'?`
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({ 
        message: 'Request timeout. Please try again.',
        error: 'API request timed out'
      });
    } else {
      res.status(500).json({ 
        message: 'Error fetching crypto details', 
        error: error.message 
      });
    }
  }
});

module.exports = router; 