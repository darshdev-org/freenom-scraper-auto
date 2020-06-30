const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const toCSV = require('objects-to-csv');

const loginPage = 'https://my.freenom.com/clientarea.php?action=domains';
const editPage = id => `https://my.freenom.com/clientarea.php?action=domaindetails&id=${id}#tab3`;

async function wait(time = 3500) {
  await new Promise((res, rej) => setTimeout(res, time));
}

async function type(page, selector, text, retried = 0) {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.click(selector.trim() + ':not([disabled])', { clickCount: 3 });
    await page.type(selector, text);
  } catch {
    if (retried === 1) return;
    console.log(`couldn't type ${text} into ${selector}, trying once again...`);
    await type(page, selector, text, 1);
  }
}

function writeFilePromise(filename, data, options = 'utf8') {
  return new Promise((resolve, reject) => {
    fs.writeFile(filename, data, options, error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

module.exports = async function(accounts, ns1, ns2) {
  try {
    console.log('Scraping Process Started!');
    let allDomains = [];

    const browser = await puppeteer.launch({
      args: ['--no-sandbox'],
      ignoreHTTPSErrors: true,
      timeout: 15000,
      handleSIGINT: true,
      handleSIGTERM: true,
      handleSIGHUP: true,
      defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();

    async function click(selector, waitForNav = false, retried = 0) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        if (waitForNav) await page.waitForNavigation();
      } catch (error) {
        if (retried === 1) return;
        console.log(`couldn't click ${selector}, trying once again...`);
        await click(selector, waitForNav, 1);
      }
    }

    async function scrapeById(id) {
      console.log(`at id ${id}`);

      try {
        await page.goto(editPage(id), { waitUntil: 'networkidle2' });
        await click('#nsform label:nth-child(2) input');

        await type(page, 'input#ns1', ns1);
        await type(page, 'input#ns2', ns2);

        await click('input.mediumBtn.primaryColor');
        await wait(500);
        return true;
      } catch (error) {
        console.log('error, retrying for id:', id);
        return false;
      }
    }

    await Promise.all([
      page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36'
      ),
      page.setExtraHTTPHeaders({ 'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8' }),
      page.setRequestInterception(true)
    ]);

    page.on('request', request => {
      if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1)
        return request.abort();

      request.continue();
    });

    for (const account of accounts) {
      try {
        await page.goto(loginPage, { waitUntil: 'networkidle2' });
        console.log('scraping:', account[0]);

        // entring the username & password
        await type(page, '#username', account[0]);
        await type(page, '#password', account[1]);

        // check remember me
        await click('.rememberMe');

        // click login btn
        await click('input[value=Login]');

        try {
          await click('[name=itemlimit]');
        } catch (error) {
          console.log(`Warning: We couldn't access ${account[0]} : ${account[1]} We'll pass!`);
          continue;
        }

        for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 6000 });

        const domains = await page.$$eval('td.second a', els =>
          els.map(td => td.getAttribute('href'))
        );

        const ids = await page.$$eval('td.seventh a', els =>
          els.map(td => td.getAttribute('href').match(/id=(\d+)/i)[1])
        );

        // edit to nameservers
        for (const id of ids) {
          let scraped = await scrapeById(id);
          while (!scraped) scraped = await scrapeById(id);
        }

        // delete all cookies to relogin
        for (const cookie of await page.cookies()) await page.deleteCookie(cookie);

        if (domains.length > 0)
          allDomains = allDomains.concat(
            domains.map(domain => {
              return {
                domain,
                account: account[0]
              };
            })
          );
      } catch (error) {
        console.log(`skiping ${account[0]} : ${account[1]}, Because of error:`);
        console.log(error);
      }
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

    console.log('DONE SCRAPING :)');
  } catch (error) {
    console.error(error);
  }
};
