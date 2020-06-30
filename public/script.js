function showInfo(text, isError = false) {
  const el = select('#info');
  el.innerHTML = text;
  el.style.display = 'block';
  if (isError) el.classList.add('error');
  else el.classList.remove('error');
  setTimeout(() => {
    el.style.display = 'none';
  }, 6000);
}

(async function() {
  const status = (await axios('/status.json')).data;
  if (!status.lastUpdate) return;

  const lastUpdate = moment(status.lastUpdate).format('DD/MM/YYYY hh:mm:ss a');

  document.body.insertAdjacentHTML(
    'beforeend',
    `
        <div class="download">
      <p>Here You Can Download The Domains List Of The Last Process</p>
      <p>Last Updated: ${lastUpdate}</p>

      <div class="col-3">
        <a href="/data.txt" target="_blank" class="btn">Text</a>
        <a href="/data.json" target="_blank" class="btn">Json</a>
        <a href="/data.CSV" target="_blank" class="btn">Csv</a>
      </div>
      <div class="deleteall" onclick="deleteall()")>Delete All Files!</div>
    </div>`
  );
})();

async function isRunningRefresh() {
  const isRunning = (await axios('/isrunning.txt')).data;

  const element = document.querySelector('.isrunning');
  if (isRunning * 1) {
    element.textContent = 'A Process Is Running Now!';
    element.style.color = 'var(--color-tertiary)';
  } else {
    element.textContent = 'No Process Is Running Now!';
    element.style.color = '#ffffff33';
  }
}

isRunningRefresh();
setInterval(isRunningRefresh, 3000);

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

  if (error.length > 0) return showInfo(error.join('<br>'), true);
  isRunningRefresh();

  axios.post('/', {
    accounts,
    ns1,
    ns2
  });

  showInfo('Request Sent Successfully!');
});

async function deleteall() {
  const res = await axios('/deleteall');
  if (res.status < 400) showInfo('All Files Are Being Deleted!');
  location.reload();
}
