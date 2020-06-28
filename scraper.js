const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const toCSV = require('objects-to-csv');

const domainsPage = 'https://my.freenom.com/clientarea.php?action=domains';
const loginPage = 'https://my.freenom.com/clientarea.php';
const editPage = id => `https://my.freenom.com/clientarea.php?action=domaindetails&id=${id}#tab3`;

async function wait(time = 3000) {
  await new Promise((res, rej) => setTimeout(res, time));
}

async function type(page, selector, text) {
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, text);
}

function writeFilePromise(filename, data, options = 'utf8') {
  return new Promise((resolve, reject) => {
    fs.writeFile(filename, data, options, error => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

module.exports = async function(accounts, ns1, ns2) {
  try {
    console.log('Scraping Process Started!');
    let allDomains = [];

    const browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      timeout: 20000,
      handleSIGINT: true,
      handleSIGTERM: true,
      handleSIGHUP: true,
      defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();

    await Promise.all([
      page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36'
      ),
      page.setExtraHTTPHeaders({ 'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8' })
    ]);

    for (const account of accounts) {
      await page.goto(loginPage, { waitUntil: 'networkidle2' });
      console.success('scraping:', account[0]);

      // entring the username & password
      await type(page, '#username', account[0]);
      await type(page, '#password', account[1]);

      // check remember me
      await page.click('.rememberMe');

      // click login btn
      page.click('input[value="Login"]');
      await wait();

      await page.goto(domainsPage, { waitUntil: 'networkidle2' });

      page.select('.resultsPerPage select', 'all');
      await wait();

      // Scrape all the domain this account has
      let { domains, ids } = await page.evaluate(() => {
        return {
          domains: Array.from(document.querySelectorAll('td.second a')).map(td =>
            td.getAttribute('href')
          ),
          ids: Array.from(document.querySelectorAll('td.seventh a')).map(
            td => td.getAttribute('href').match(/id=(\d+)/i)[1]
          )
        };
      });

      if (!Array.isArray(domains) && domains.length > 1)
        console.log("couldn't scrape domains for", JSON.stringify(account));
      else
        allDomains = allDomains.concat(
          domains.map(domain => {
            return {
              domain,
              account: account[0]
            };
          })
        );

      // edit to nameservers
      for (const id of ids) {
        console.log(`at id ${id}`);

        await page.goto(editPage(id), {
          waitUntil: 'networkidle2'
        });

        await page.click('#nsform p label:nth-child(2) input');

        await type(page, 'input#ns1', ns1);
        await type(page, 'input#ns2', ns2);

        await page.click('input[value="Change Nameservers"]');
        await wait();
      }

      // delete all cookies to relogin
      for (const cookie of await page.cookies()) await page.deleteCookie(cookie);
    }

    await browser.close();

    // saving JSON
    await writeFilePromise(path.join(__dirname, `public/data.json`), JSON.stringify(allDomains));

    // Saving Text
    let txt = '';
    allDomains.forEach(dom => (txt += `\naccount:${dom.account}\tdomain:${dom.domain}`));
    await writeFilePromise(path.join(__dirname, `public/data.txt`), txt);

    // Saving CSV
    await new toCSV(allDomains).toDisk('./public/data.csv');

    // saving status
    await writeFilePromise(
      path.join(__dirname, `public/status.json`),
      JSON.stringify({ lastUpdate: new Date() })
    );

    console.log('done scraping & changing nameservers!');
  } catch (error) {
    console.error(error);
  }
};
