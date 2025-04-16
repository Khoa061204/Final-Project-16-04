const express = require('express');
const app = express();
const router = express.Router(); // ✅ Define router

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

/* GET home page. */
router.get('/', function(req, res) {
  res.send('Welcome to the Home Page'); // ✅ Use res.send() if not using a template engine
});

// ✅ Make sure to use the router
app.use("/", router);

module.exports = router;
