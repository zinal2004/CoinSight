const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get user's portfolio
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.portfolio);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching portfolio', error: error.message });
  }
});

// Add cryptocurrency to portfolio
router.post('/add', auth, async (req, res) => {
  try {
    console.log('Received body:', req.body);
    const { coinId, amount, purchasePrice } = req.body;
    if (!coinId || typeof amount !== 'number' || isNaN(amount) || typeof purchasePrice !== 'number' || isNaN(purchasePrice)) {
      return res.status(400).json({ message: 'Invalid input: coinId, amount, and purchasePrice are required and must be valid numbers.' });
    }
    const user = await User.findById(req.user._id);
    user.portfolio.push({
      coinId,
      amount,
      purchasePrice,
      purchaseDate: new Date()
    });
    await user.save();
    res.status(201).json(user.portfolio);
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
    if (index >= user.portfolio.length) {
      return res.status(404).json({ message: 'Portfolio entry not found' });
    }
    
    user.portfolio.splice(index, 1);
    await user.save();
    
    res.json(user.portfolio);
  } catch (error) {
    res.status(500).json({ message: 'Error removing from portfolio', error: error.message });
  }
});

module.exports = router; 