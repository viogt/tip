const locPrefix = 'tipEditor';

function saveDoc(key, jsn, ovrwr) {
	const k = locPrefix + key;
	if(!ovrwr) if(localStorage.getItem(k)) return 1;
	const dt = new Date();
	const d = dt.toLocaleDateString("de-DE") + ' ' + dt.toLocaleTimeString();
	const val = {
		name: key,
		date: d,
		content: jsn };
	try {
		localStorage.setItem(k, JSON.stringify(val));
		return 0;
	} catch(err) { return 2; }
}

function uite() {
	document.getElementById('loadFromFile').showModal();
	locList();
}

function locList() {
	const t = document.getElementById('locStorage'),
		locLen = localStorage.length,
		prefLen = locPrefix.length;
	t.replaceChildren();
	for (let i = 0; i < locLen; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith(locPrefix)) continue;
	  const jsn = JSON.parse(localStorage.getItem(key));
	  const r = t.insertRow();
	  r.insertCell().textContent = key.slice(prefLen);
	  r.insertCell().textContent = jsn.date;
	  const c = r.insertCell();
	  const b = document.createElement('button');
	  b.textContent = 'delete';
	  b.addEventListener('click', e => {
		const curRow = e.target.closest('tr');
		const key = curRow.cells[0].textContent;
		if(confirm('Delete ' + key + '?')) {
			localStorage.removeItem(locPrefix + key);
			curRow.closest('dialog').close();
		}
	  });
	  c.append(b);
	}
}