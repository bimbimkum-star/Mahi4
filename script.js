// लोकल स्टोरेज से डेटा लोड करना
let transactions = JSON.parse(localStorage.getItem('khataTransactions')) || [];

// DOM एलिमेंट्स
const micBtn = document.getElementById('micBtn');
const micText = document.getElementById('micText');
const liveTranscript = document.getElementById('liveTranscript');
const ledgerForm = document.getElementById('ledgerForm');
const custNameInput = document.getElementById('custName');
const amountInput = document.getElementById('amount');
const transTypeInput = document.getElementById('transType');
const ledgerTableBody = document.getElementById('ledgerTableBody');
const totalInEl = document.getElementById('totalIn');
const totalOutEl = document.getElementById('totalOut');
const netBalanceEl = document.getElementById('netBalance');
const clearAllBtn = document.getElementById('clearAllBtn');

// 1. टेक्स्ट-टू-स्पीच (ऑडियो बोलकर पुष्टि करना)
function speakConfirmation(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

// 2. वॉयस रिकॉग्निशन (Web Speech API)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'hi-IN'; // हिंदी भाषा सपोर्ट
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  micBtn.addEventListener('click', () => {
    if (micBtn.classList.contains('listening')) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });

  recognition.onstart = () => {
    micBtn.classList.add('listening');
    micText.innerText = 'सुन रहा हूँ, बोलिए...';
    liveTranscript.innerText = 'माइक सक्रिय है...';
  };

  recognition.onend = () => {
    micBtn.classList.remove('listening');
    micText.innerText = 'माइक चालू करें और बोलें';
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    liveTranscript.innerText = 'पहचानने में त्रुटि हुई। कृपया दोबारा बोलें।';
    micBtn.classList.remove('listening');
    micText.innerText = 'माइक चालू करें और बोलें';
  };

  recognition.onresult = (event) => {
    const spokenText = event.results[0][0].transcript;
    liveTranscript.innerText = `सुना गया: "${spokenText}"`;
    parseAndAddVoiceEntry(spokenText);
  };
} else {
  micBtn.disabled = true;
  micText.innerText = 'ब्राउज़र में वॉयस सपोर्ट उपलब्ध नहीं';
  liveTranscript.innerText = 'कृपया Chrome या Edge ब्राउज़र का उपयोग करें।';
}

// 3. वॉयस टेक्स्ट पार्सर (नेचुरल लैंग्वेज पहचान)
function parseAndAddVoiceEntry(text) {
  const lower = text.toLowerCase();

  // नंबर (राशि) निकालना
  const numbers = text.match(/\d+/g);
  if (!numbers) {
    speakConfirmation('माफ़ कीजिए, राशि समझ नहीं आई। दोबारा बोलिए।');
    return;
  }
  const amount = parseFloat(numbers[0]);

  // प्रकार पहचानना: मिला/जमा (IN) या दिया/उधार (OUT)
  let type = 'IN';
  const outKeywords = ['दिया', 'दिए', 'भेजा', 'भेजे', 'उधार दिया', 'पे किया'];
  const inKeywords = ['मिला', 'मिले', 'आया', 'आए', 'जमा', 'प्राप्त'];

  if (outKeywords.some(keyword => lower.includes(keyword))) {
    type = 'OUT';
  } else if (inKeywords.some(keyword => lower.includes(keyword))) {
    type = 'IN';
  }

  // नाम पहचानना: 'को', 'से', 'ने' से पहले का शब्द
  let name = 'ग्राहक';
  const match = text.match(/(.*?)(?:को|से|ने)/);
  if (match && match[1]) {
    name = match[1].replace(/\d+/g, '').replace(/रुपये|रुपया|रू/g, '').trim();
  }

  if (!name || name.length === 0) {
    name = 'अज्ञात ग्राहक';
  }

  // डेटा जोड़ें
  addTransaction(name, amount, type);

  // ऑडियो पुष्टि
  const typeText = type === 'IN' ? 'जमा' : 'उधार';
  speakConfirmation(`${name} के खाते में ${amount} रुपये ${typeText} दर्ज हो गए हैं।`);
}

// 4. नया ट्रांजेक्शन जोड़ना
function addTransaction(name, amount, type) {
  const dateStr = new Date().toLocaleString('hi-IN', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

  const entry = {
    id: Date.now(),
    name: name,
    amount: amount,
    type: type,
    date: dateStr
  };

  transactions.unshift(entry);
  saveAndRender();
}

// 5. मैन्युअल फॉर्म सबमिशन
ledgerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = custNameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const type = transTypeInput.value;

  if (name && !isNaN(amount)) {
    addTransaction(name, amount, type);
    speakConfirmation(`${name} की एंट्री दर्ज हो गई है।`);
    ledgerForm.reset();
  }
});

// 6. एंट्री डिलीट करना
function deleteTransaction(id) {
  transactions = transactions.filter(item => item.id !== id);
  saveAndRender();
}

// 7. सारा डेटा साफ़ करना
clearAllBtn.addEventListener('click', () => {
  if (confirm('क्या आप सच में सारा खाताबुक डेटा मिटाना चाहते हैं?')) {
    transactions = [];
    saveAndRender();
    speakConfirmation('खाता पूरी तरह साफ़ कर दिया गया है।');
  }
});

// 8. डेटा सेव और UI अपडेट
function saveAndRender() {
  localStorage.setItem('khataTransactions', JSON.stringify(transactions));
  renderTable();
  updateSummary();
}

// 9. टेबल रेंडरिंग
function renderTable() {
  ledgerTableBody.innerHTML = '';

  if (transactions.length === 0) {
    ledgerTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888;">कोई एंट्री मौजूद नहीं है</td></tr>`;
    return;
  }

  transactions.forEach(item => {
    const row = document.createElement('tr');
    const isIncome = item.type === 'IN';
    
    row.innerHTML = `
      <td>${item.date}</td>
      <td><strong>${item.name}</strong></td>
      <td class="${isIncome ? 'type-in' : 'type-out'}">${isIncome ? 'जमा (IN)' : 'उधार (OUT)'}</td>
      <td class="${isIncome ? 'type-in' : 'type-out'}">₹${item.amount.toLocaleString('en-IN')}</td>
      <td><button class="del-btn" onclick="deleteTransaction(${item.id})">❌</button></td>
    `;
    ledgerTableBody.appendChild(row);
  });
}

// 10. समरी कार्ड्स अपडेट
function updateSummary() {
  let totalIn = 0;
  let totalOut = 0;

  transactions.forEach(item => {
    if (item.type === 'IN') {
      totalIn += item.amount;
    } else {
      totalOut += item.amount;
    }
  });

  const netBalance = totalIn - totalOut;

  totalInEl.innerText = `₹${totalIn.toLocaleString('en-IN')}`;
  totalOutEl.innerText = `₹${totalOut.toLocaleString('en-IN')}`;
  netBalanceEl.innerText = `₹${netBalance.toLocaleString('en-IN')}`;
}

// पेज लोड पर रेंडर
window.onload = () => {
  renderTable();
  updateSummary();
};
