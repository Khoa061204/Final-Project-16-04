const express = require('express');
const router = express.Router(); // ✅ Define router

/* GET home page. */
router.get('/', function(req, res) {
  res.send('Welcome to the Home Page'); // ✅ Use res.send() if not using a template engine
});

// Export the router instead of creating a new server instance
module.exports = router;
