const params = new URLSearchParams(window.location.search);
const customer = params.get('customer') || '';
const to = params.get('to') || '';
const subject = params.get('subject') || '';
const body = params.get('body') || '';

document.getElementById('customerValue').textContent = customer;

const toInput = document.getElementById('toInput');
const subjectInput = document.getElementById('subjectInput');
const bodyInput = document.getElementById('bodyInput');

toInput.value = to;
subjectInput.value = subject;
bodyInput.value = body;

const openGmailBtn = document.getElementById('openGmailBtn');
const connectGmailBtn = document.getElementById('connectGmailBtn');
const sendGmailBtn = document.getElementById('sendGmailBtn');
const composeHint = document.getElementById('composeHint');
const composeStatus = document.getElementById('composeStatus');

openGmailBtn.addEventListener('click', () => {
  const gmailUrl =
    'https://mail.google.com/mail/?view=cm&fs=1' +
    `&to=${encodeURIComponent(toInput.value)}` +
    `&su=${encodeURIComponent(subjectInput.value)}` +
    `&body=${encodeURIComponent(bodyInput.value)}`;
  window.open(gmailUrl, '_blank');
  composeStatus.textContent =
    'Gmail opened in a new tab with this message as a draft — review, attach the downloaded PDF, and press Send there.';
  composeStatus.className = 'status-msg success';
});

sendGmailBtn.addEventListener('click', async () => {
  sendGmailBtn.disabled = true;
  composeStatus.textContent = 'Sending...';
  composeStatus.className = 'status-msg';
  try {
    const res = await fetch('/api/send-gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: toInput.value, subject: subjectInput.value, body: bodyInput.value }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    composeStatus.textContent = 'Email sent with the report PDF attached.';
    composeStatus.className = 'status-msg success';
  } catch (err) {
    composeStatus.textContent = `Error: ${err.message}`;
    composeStatus.className = 'status-msg error';
  } finally {
    sendGmailBtn.disabled = false;
  }
});

async function refreshGmailStatus() {
  try {
    const res = await fetch('/api/gmail-status');
    const data = await res.json();
    if (!data.ok) throw new Error('status check failed');
    if (data.authorized) {
      composeHint.textContent = 'Gmail is connected. Sending will attach the generated PDF automatically.';
      sendGmailBtn.classList.remove('hidden');
      openGmailBtn.classList.remove('hidden');
      connectGmailBtn.classList.add('hidden');
    } else if (data.credentialsConfigured) {
      composeHint.textContent = 'Gmail is not connected yet — connect once to send with the PDF attached automatically.';
      connectGmailBtn.classList.remove('hidden');
      openGmailBtn.classList.remove('hidden');
      sendGmailBtn.classList.add('hidden');
    } else {
      composeHint.textContent =
        'Gmail API is not set up yet on this machine. Use "Open in Gmail" and attach the downloaded PDF manually.';
      openGmailBtn.classList.remove('hidden');
      sendGmailBtn.classList.add('hidden');
      connectGmailBtn.classList.add('hidden');
    }
  } catch (err) {
    composeHint.textContent = 'Could not check Gmail connection status.';
    openGmailBtn.classList.remove('hidden');
  }
}

refreshGmailStatus();
