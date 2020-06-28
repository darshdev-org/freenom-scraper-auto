function showInfo(text, isError = false) {
  const el = document.querySelector('#info');
  el.innerHTML = text;
  el.style.display = 'block';

  setTimeout(() => {
    el.style.display = 'none';
  }, 5000);
}

async function getStatus() {
  const status = (await axios('/status.json')).data;
  const lastUpdate = moment(status.lastUpdate).format('DD/MM/YYYY hh:mm:ss a');

  document.body.insertAdjacentHTML(
    'beforeend',
    `
        <div class="download">
      <p>Here You Can Download The Domains List Of The Last Process</p>
      <p>Last Updated: ${lastUpdate}</p>

      <div class="col-3">
        <a href="/data.txt" class="btn">Text</a>
        <a href="/data.json" class="btn">Json</a>
        <a href="/data.CSV" class="btn">Csv</a>
      </div>
    </div>`
  );
}

getStatus();

document.querySelector('form').addEventListener('submit', async e => {
  e.preventDefault();

  let error = [];
  const value = index => e.srcElement[index].value;
  const accounts = value(0)
    .trim()
    .split('\n')
    .filter(el => el.includes(':'))
    .map(el => el.split(':'));
  const ns1 = value(1);
  const ns2 = value(2);

  if (accounts.length === 0)
    error.push(
      'You must provide one account at least, Make sure you type then in the right format.'
    );
  if (!ns1 || !ns2) error.push('Both namservers one & two are required.');

  if (error.length > 0) showInfo(error.join('<br>'), true);

  axios.post('/', {
    accounts,
    ns1,
    ns2
  });

  showInfo('Request Sent Successfully!');
});
