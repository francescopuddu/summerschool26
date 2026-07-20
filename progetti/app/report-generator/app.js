const generateDataBtn = document.getElementById('generateDataBtn');
const generateDataStatus = document.getElementById('generateDataStatus');
const refreshFiltersBtn = document.getElementById('refreshFiltersBtn');
const customerChecks = document.getElementById('customerChecks');
const trainTypeChecks = document.getElementById('trainTypeChecks');
const periodChips = document.getElementById('periodChips');
const periodTextInput = document.getElementById('periodTextInput');
const periodSuggestions = document.getElementById('periodSuggestions');
const generateReportBtn = document.getElementById('generateReportBtn');
const generateReportStatus = document.getElementById('generateReportStatus');
const reportPreview = document.getElementById('reportPreview');
const sendToCustomerBtn = document.getElementById('sendToCustomerBtn');
const saveReportBtn = document.getElementById('saveReportBtn');
const postActionStatus = document.getElementById('postActionStatus');
const backBtn = document.getElementById('backBtn');
const screenFilters = document.getElementById('screen-filters');
const screenReport = document.getElementById('screen-report');

function setStatus(el, message, kind) {
  el.textContent = message;
  el.className = 'status-msg' + (kind ? ' ' + kind : '');
}

let selectedPeriods = [];
let allAvailablePeriods = [];

function fillChecklist(container, options, groupName, previouslyChecked) {
  container.innerHTML = '';
  options.forEach((opt) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = opt;
    input.name = groupName;
    input.checked = previouslyChecked.includes(opt);
    input.addEventListener('change', onFilterChange);
    label.appendChild(input);
    label.appendChild(document.createTextNode(opt));
    container.appendChild(label);
  });
}

function getChecked(container) {
  return [...container.querySelectorAll('input:checked')].map((i) => i.value);
}

function renderPeriodChips() {
  periodChips.innerHTML = '';
  selectedPeriods.forEach((p) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = p;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'chip-remove';
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      selectedPeriods = selectedPeriods.filter((sp) => sp !== p);
      renderPeriodChips();
      onFilterChange();
    });
    chip.appendChild(remove);
    periodChips.appendChild(chip);
  });
}

function addPeriod(p) {
  if (!selectedPeriods.includes(p)) selectedPeriods.push(p);
  periodTextInput.value = '';
  hideSuggestions();
  renderPeriodChips();
  onFilterChange();
}

function hideSuggestions() {
  periodSuggestions.classList.add('hidden');
  periodSuggestions.innerHTML = '';
}

function showSuggestionsFor(query) {
  const q = query.trim().toLowerCase();
  if (!q) return hideSuggestions();
  const matches = allAvailablePeriods.filter((p) => {
    if (selectedPeriods.includes(p)) return false;
    const [month, year] = p.split('-');
    return month.toLowerCase().startsWith(q) || p.toLowerCase().includes(q) || year.includes(q);
  });
  if (!matches.length) return hideSuggestions();
  periodSuggestions.innerHTML = '';
  matches.slice(0, 8).forEach((p) => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = p;
    item.addEventListener('click', () => addPeriod(p));
    periodSuggestions.appendChild(item);
  });
  periodSuggestions.classList.remove('hidden');
}

periodTextInput.addEventListener('input', () => showSuggestionsFor(periodTextInput.value));
periodTextInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const q = periodTextInput.value.trim().toLowerCase();
    if (!q) return;
    const exact = allAvailablePeriods.find((p) => p.toLowerCase() === q || p.toLowerCase().startsWith(q));
    if (exact) addPeriod(exact);
  }
});
document.addEventListener('click', (e) => {
  if (!periodSuggestions.contains(e.target) && e.target !== periodTextInput) hideSuggestions();
});

async function loadFilters({ preserveSelection = false } = {}) {
  try {
    const selectedCustomers = preserveSelection ? getChecked(customerChecks) : [];
    const selectedTrainTypes = preserveSelection ? getChecked(trainTypeChecks) : [];
    if (!preserveSelection) selectedPeriods = [];

    const query = new URLSearchParams();
    selectedCustomers.forEach((c) => query.append('customers', c));
    selectedTrainTypes.forEach((t) => query.append('trainTypes', t));
    selectedPeriods.forEach((p) => query.append('periods', p));

    const res = await fetch(`/api/filters?${query.toString()}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);

    fillChecklist(customerChecks, data.customers, 'customer', selectedCustomers.filter((c) => data.customers.includes(c)));
    fillChecklist(trainTypeChecks, data.trainTypes, 'trainType', selectedTrainTypes.filter((t) => data.trainTypes.includes(t)));
    allAvailablePeriods = data.periods;
    selectedPeriods = selectedPeriods.filter((p) => data.periods.includes(p));
    renderPeriodChips();

    setStatus(generateDataStatus, '', '');
  } catch (err) {
    setStatus(generateDataStatus, `Filters unavailable: ${err.message}`, 'error');
  }
}

function onFilterChange() {
  loadFilters({ preserveSelection: true });
}

generateDataBtn.addEventListener('click', async () => {
  generateDataBtn.disabled = true;
  setStatus(generateDataStatus, 'Generating...', '');
  try {
    const res = await fetch('/api/generate-data', { method: 'POST' });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setStatus(generateDataStatus, `Done — ${data.processed} tickets processed.`, 'success');
    await loadFilters();
  } catch (err) {
    setStatus(generateDataStatus, `Error: ${err.message}`, 'error');
  } finally {
    generateDataBtn.disabled = false;
  }
});

refreshFiltersBtn.addEventListener('click', () => loadFilters());

function showScreen(screen) {
  screenFilters.classList.add('hidden');
  screenReport.classList.add('hidden');
  screen.classList.remove('hidden');
}

backBtn.addEventListener('click', () => showScreen(screenFilters));

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
}

async function renderPdfPreview(arrayBuffer) {
  reportPreview.innerHTML = '';
  if (!window.pdfjsLib) {
    reportPreview.innerHTML = '<div class="preview-msg">PDF preview engine failed to load. Use Download or Save to view the report.</div>';
    return;
  }
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.4 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    reportPreview.appendChild(canvas);
  }
}

generateReportBtn.addEventListener('click', async () => {
  generateReportBtn.disabled = true;
  setStatus(generateReportStatus, 'Generating report...', '');
  try {
    const body = {
      customers: getChecked(customerChecks),
      trainTypes: getChecked(trainTypeChecks),
      periods: selectedPeriods,
    };
    const res = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate report');
    }
    const arrayBuffer = await res.arrayBuffer();
    setStatus(generateReportStatus, '', '');
    setStatus(postActionStatus, '', '');
    showScreen(screenReport);
    await renderPdfPreview(arrayBuffer);
  } catch (err) {
    setStatus(generateReportStatus, `Error: ${err.message}`, 'error');
  } finally {
    generateReportBtn.disabled = false;
  }
});

saveReportBtn.addEventListener('click', async () => {
  saveReportBtn.disabled = true;
  setStatus(postActionStatus, 'Saving...', '');
  try {
    const res = await fetch('/api/save-report', { method: 'POST' });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setStatus(postActionStatus, `Saved as reports/${data.filename}`, 'success');
  } catch (err) {
    setStatus(postActionStatus, `Error: ${err.message}`, 'error');
  } finally {
    saveReportBtn.disabled = false;
  }
});

sendToCustomerBtn.addEventListener('click', async () => {
  sendToCustomerBtn.disabled = true;
  setStatus(postActionStatus, 'Preparing email...', '');
  try {
    const res = await fetch('/api/send-email', { method: 'POST' });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    const query = new URLSearchParams({
      customer: data.customer,
      to: data.to,
      subject: data.subject,
      body: data.body,
    });
    window.open(`compose.html?${query.toString()}`, '_blank');
    setStatus(postActionStatus, '', '');
  } catch (err) {
    setStatus(postActionStatus, `Error: ${err.message}`, 'error');
  } finally {
    sendToCustomerBtn.disabled = false;
  }
});

loadFilters();
