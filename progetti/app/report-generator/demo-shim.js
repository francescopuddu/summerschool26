/* Demo summer school: shim delle API del backend Express.
   Il frontend è quello originale; le risposte arrivano da dati mock statici
   e il PDF è stato generato una volta con il vero lib/pdf.js dell'app. */
(function () {
  const realFetch = window.fetch.bind(window);
  let mockData = null;
  const loadMock = async () => {
    if (!mockData) mockData = await (await realFetch('mock_tickets.json')).json();
    return mockData;
  };
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function filterTickets(tickets, { customers = [], trainTypes = [], periods = [] }) {
    return tickets.filter((t) =>
      (!customers.length || customers.includes(t.client)) &&
      (!trainTypes.length || trainTypes.includes(t.trainType)) &&
      (!periods.length || periods.includes(t.period)));
  }
  function options(tickets, sel) {
    const uniq = (arr) => [...new Set(arr)];
    const customers = uniq(filterTickets(tickets, { ...sel, customers: [] }).map((t) => t.client)).sort();
    const trainTypes = uniq(filterTickets(tickets, { ...sel, trainTypes: [] }).map((t) => t.trainType)).sort();
    const periods = uniq(filterTickets(tickets, { ...sel, periods: [] }).map((t) => t.period))
      .sort((a, b) => MONTH_ORDER.indexOf(a.split('-')[0]) - MONTH_ORDER.indexOf(b.split('-')[0]));
    return { customers, trainTypes, periods };
  }

  window.fetch = async function (url, opts = {}) {
    const u = typeof url === 'string' ? url : url.url;
    if (!u.includes('/api/')) return realFetch(url, opts);
    const { tickets } = await loadMock();

    if (u.includes('/api/filters')) {
      const q = new URLSearchParams(u.split('?')[1] || '');
      const sel = { customers: q.getAll('customers'), trainTypes: q.getAll('trainTypes'), periods: q.getAll('periods') };
      return json({ ok: true, ...options(tickets, sel) });
    }
    if (u.includes('/api/generate-data')) {
      await delay(900);
      return json({ ok: true, processed: tickets.length });
    }
    if (u.includes('/api/generate-report')) {
      await delay(700);
      const body = opts.body ? JSON.parse(opts.body) : {};
      if (!filterTickets(tickets, body).length)
        return json({ ok: false, error: 'No tickets match the selected filters.' }, 400);
      return realFetch('sample_report.pdf'); // PDF demo pre-generato col vero lib/pdf.js
    }
    if (u.includes('/api/save-report'))
      return json({ ok: true, filename: 'Nordbahn-CS200-demo.pdf' });
    if (u.includes('/api/send-email'))
      return json({ ok: true, customer: 'Nordbahn AG', to: 'fleet.manager@nordbahn-demo.eu',
        subject: 'Fleet Reliability Report — CS-200',
        body: 'Dear Customer,\n\nplease find attached the fleet reliability report for the selected period.\n\nBest regards,\nReliability Engineering Team' });
    if (u.includes('/api/gmail-status'))
      return json({ ok: true, authorized: false });
    if (u.includes('/api/send-gmail'))
      return json({ ok: false, error: 'Invio non disponibile nella demo web (nell\'app reale parte via Gmail API).' }, 400);
    return realFetch(url, opts);
  };
})();
