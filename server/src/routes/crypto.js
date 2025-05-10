const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');
const User = require('../models/User');
const fetch = require('node-fetch');

// Get top cryptocurrencies
router.get('/top', async (req, res) => {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false'
    );
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid data from CoinGecko');
    res.json(data);
  } catch (err) {
    console.error('COINGECKO TOP ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch top cryptocurrencies', error: err.message });
  }
});

// Get cryptocurrency details
router.get('/:id', async (req, res) => {
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${req.params.id}`, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching crypto details', error: error.message });
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
    console.error('WATCHLIST ERROR:', error);
    res.status(500).json({ message: 'Error fetching watchlist', error: error.message });
  }
});

// Add to watchlist
router.post('/watchlist/add', auth, async (req, res) => {
  try {
    const { coinId } = req.body;
    const user = await User.findById(req.user._id);
    if (!user.watchlist.some(item => item.coinId === coinId)) {
      user.watchlist.push({ coinId });
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

module.exports = router; 