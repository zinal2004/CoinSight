const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

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

// Get user's portfolio
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.portfolio || []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching portfolio', error: error.message });
  }
});

// Add to portfolio
router.post('/add', auth, async (req, res) => {
  try {
    const { coinId, amount, purchasePrice } = req.body;
    const correctCoinId = getCorrectCoinId(coinId);
    
    if (!correctCoinId || !amount || !purchasePrice) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if coin already exists in portfolio
    const existingHolding = user.portfolio.find(holding => holding.coinId === correctCoinId);
    
    if (existingHolding) {
      // Update existing holding
      existingHolding.amount += parseFloat(amount);
      existingHolding.purchasePrice = (existingHolding.purchasePrice + parseFloat(purchasePrice)) / 2;
    } else {
      // Add new holding
      user.portfolio.push({
        coinId: correctCoinId,
        amount: parseFloat(amount),
        purchasePrice: parseFloat(purchasePrice)
      });
    }
    
    await user.save();
    res.json(user.portfolio);
  } catch (error) {
    res.status(500).json({ message: 'Error adding to portfolio', error: error.message });
  }
});

// Update portfolio entry
router.put('/update/:index', auth, async (req, res) => {
  try {
    const { amount, purchasePrice } = req.body;
    const index = parseInt(req.params.index);
    
    const user = await User.findById(req.user._id);
    if (index >= user.portfolio.length) {
      return res.status(404).json({ message: 'Portfolio entry not found' });
    }
    
    user.portfolio[index] = {
      ...user.portfolio[index],
      amount,
      purchasePrice
    };
    
    await user.save();
    res.json(user.portfolio);
  } catch (error) {
    res.status(500).json({ message: 'Error updating portfolio', error: error.message });
  }
});

// Remove from portfolio
router.delete('/remove/:index', auth, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (index < 0 || index >= user.portfolio.length) {
      return res.status(400).json({ message: 'Invalid index' });
    }
    
    user.portfolio.splice(index, 1);
    await user.save();
    
    res.json(user.portfolio);
  } catch (error) {
    res.status(500).json({ message: 'Error removing from portfolio', error: error.message });
  }
});

module.exports = router; 