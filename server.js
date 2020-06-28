const express = require('express');
const consola = require('consola');
const scraper = require('./scraper');
const app = express();

app.use(express.static('public'));
app.use(express.json());

app.post('/', async (req, res) => {
  const { accounts, ns1, ns2 } = req.body;
  scraper(accounts, ns1, ns2);
  res.end();
});

const port = process.env.PORT || 1212;
app.listen(port, () => {
  console.clear();

  console.log = consola.info;
  console.error = consola.error;
  console.warn = consola.warn;
  console.success = consola.success;
  console.ready = consola.ready;

  console.log(`App running on port ${port}...`);
});
