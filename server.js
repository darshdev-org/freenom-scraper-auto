const express = require('express');
const path = require('path');
const fs = require('fs');
const scraper = require('./scraper');
const https = require('https');
function isRunning(bool = true, options = 'utf8') {
  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(__dirname, `public/isrunning.txt`), bool * 1, options, error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

const app = express();

app.use(express.static('public'));
app.use(express.json());

app.post('/', async (req, res) => {
  const { accounts, ns1, ns2 } = req.body;
  res.end();

  await isRunning();
  await scraper(accounts, ns1, ns2);
  await isRunning(false);
});

app.get('/deleteall', async (req, res) => {
  try {
    res.end();

    [
      'public/data.txt',
      'public/data.csv',
      'public/data.json',
      'public/status.json',
      'public/isrunning.txt'
    ].forEach(file => fs.unlink(path.join(__dirname, file), () => {}));
  } catch (error) {
    console.error(error);
  }
});

const port = process.env.PORT || 1212;
app.listen(port, () => {
  console.clear();
  console.log(`App running on port ${port}...`);
});
