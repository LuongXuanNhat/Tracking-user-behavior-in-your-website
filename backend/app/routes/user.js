// routes/user.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  res.status(201).json({ id: Date.now(), name });
});

module.exports = router;
