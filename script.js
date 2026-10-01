/**
 * खाताबुक प्रो - कोर इंजन
 */

// स्टेट प्रबंधन
let transactions = JSON.parse(localStorage.getItem('khataTransactionsPro')) || [];

// DOM तत्व
const micBtn = document.getElementById('micBtn');
const micStatusText = document.getElementById('micStatusText');
const soundwaveBox = document.getElementById('soundwaveBox');
const transcriptDisplay = document.getElementById('transcriptDisplay');

const totalInDisplay = document.getElementById('totalInDisplay');
const totalOutDisplay = document.getElementById('totalOutDisplay');
const netBalanceDisplay = document.getElementById('netBalanceDisplay');

const addEntryForm = document.getElementById('addEntryForm');
const manualName = document.getElementById('manualName');
const manualAmount = document.getElementById('manualAmount');
const manualType = document.getElementById('manualType');
const manualDateTime = document.getElementById('manualDateTime');

const ledgerBody = document.getElementById('ledgerBody');
const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');

const editModal = document.getElementById('editModal');
const editEntryForm = document.getElementById('editEntryForm');
const editEntryId = document.getElementById('editEntryId');
const editName = document.getElementById('editName');
const editAmount = document.getElementById('editAmount');
const editType = document.getElementById('editType');
const editDateTime = document.getElementById('editDateTime');
const closeEditModal = document.getElementById('closeEditModal');
const cancelEditBtn = document.getElementById('cancelEditBtn');

const openPrintModalBtn = document.getElementById('openPrintModalBtn');
const printChoiceModal = document.getElementById('printChoiceModal');
const closePrintModal = document.getElementById('closePrintModal');
const printCustomerFilter = document.getElementById('printCustomerFilter');
const triggerPrintA4 = document.getElementById('triggerPrintA4');
const triggerPrintRoll = document.getElementById('triggerPrintRoll');
const printArea = document.getElementById('printArea');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// इनपुट में वर्तमान समय डिफ़ॉल्ट सेट करें
function setCurrentDateTimeInput(inputElement) {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
  inputElement.value = localISOTime;
}
setCurrentDateTimeInput(manualDateTime);

// 1. टेक्स्ट-टू-स्पीच (आवाज़ में जवाब देना)
function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

// 2. वॉयस असिस्टेंट इंजन (Web Speech API)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'hi-IN';
  recognition.interimResults = false;
  recognition.continuous = false;

  micBtn.addEventListener('click', () => {
    if (micBtn.classList.contains('recording')) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (e) {
        console.error(e);
      }
    }
  });

  recognition.onstart = () => {
    micBtn.classList.add('recording');
    soundwaveBox.classList.add('active');
    micStatusText.innerText = 'सुन रहा हूँ... बोलिए';
    transcriptDisplay.innerText = 'माइक एक्टिव है...';
  };

  recognition.onend = () => {
    micBtn.classList.remove('recording');
    soundwaveBox.classList.remove('active');
    micStatusText.innerText = 'माइक चालू करने के लिए दबाएं';
  };

  recognition.onerror = () => {
    transcriptDisplay.innerText = 'पहचानने में असमर्थ। पुनः प्रयास करें।';
    micBtn.classList.remove('recording');
    soundwaveBox.classList.remove('active');
  };

  recognition.onresult = (event) => {
    const rawSpoken = event.results[0][0].transcript;
    transcriptDisplay.innerText = `सुना: "${rawSpoken}"`;
    processVoiceCommand(rawSpoken);
  };
} else {
  micBtn.disabled = true;
  micStatusText.innerText = 'ब्राउज़र में वॉयस उपलब्ध नहीं (Chrome प्रयोग करें)';
}

// 3. स्मार्ट पार्सर: एंट्री या क्वेरी (सवाल पूछना)
function processVoiceCommand(text) {
  const query = text.toLowerCase();

  // (A) सवाल पहचानना: "राजू का बकाया कितना है?" या "आज का कुल जमा"
  if (query.includes('बकाया') || query.includes('हिसाब') || query.includes('कितना') || query.includes('कुल')) {
    handleVoiceQuery(query);
    return;
  }

  // (B) नया लेन-देन दर्ज करना
  const numbers = text.match(/\d+/g);
  if (!numbers) {
    speak('मुझे कोई राशि नहीं सुनाई दी। कृपया दोबारा बोलें।');
    return;
  }
  const amount = parseFloat(numbers[0]);

  let type = 'IN';
  const outWords = ['दिया', 'दिए', 'भेजा', 'भेजे', 'उधार दिया', 'पे किया'];
  if (outWords.some(w => query.includes(w))) {
    type = 'OUT';
  }

  // नाम अलग करना
  let name = 'अज्ञात ग्राहक';
  const nameMatch = text.match(/(.*?)(?:को|से|ने)/);
  if (nameMatch && nameMatch[1]) {
    name = nameMatch[1].replace(/\d+/g, '').replace(/रुपये|रुपया|रू/g, '').trim();
  }

  const nowIso = new Date().toISOString();
  addTransaction(name, amount, type, nowIso);
  const typeHindi = type === 'IN' ? 'जमा' : 'उधार';
  speak(`${name} के खाते में ₹${amount} ${typeHindi} दर्ज हो गए हैं।`);
}

// वॉयस क्वेरी का जवाब
function handleVoiceQuery(query) {
  if (query.includes('आज का')) {
    const todayStr = new Date().toLocaleDateString('en-GB');
    let todayIn = 0;
    transactions.forEach(t => {
      const tDate = new Date(t.timestamp).toLocaleDateString('en-GB');
      if (tDate === todayStr && t.type === 'IN') todayIn += t.amount;
    });
    speak(`आज का कुल जमा ${todayIn} रुपये है।`);
    return;
  }

  // किसी ग्राहक का नाम ढूँढना
  let targetCustomer = '';
  transactions.forEach(t => {
    if (query.includes(t.name.toLowerCase())) {
      targetCustomer = t.name;
    }
  });

  if (targetCustomer) {
    let cBalance = 0;
    transactions.filter(t => t.name.toLowerCase() === targetCustomer.toLowerCase()).forEach(t => {
      if (t.type === 'OUT') cBalance += t.amount; // देना बाकी
      else cBalance -= t.amount;
    });

    if (cBalance > 0) {
      speak(`${targetCustomer} के यहाँ कुल ${cBalance} रुपये का उधार बकाया है।`);
    } else if (cBalance < 0) {
      speak(`${targetCustomer} का ${Math.abs(cBalance)} रुपये अग्रिम जमा है।`);
    } else {
      speak(`${targetCustomer} का हिसाब बिल्कुल बराबर है।`);
    }
  } else {
    speak('माफ़ कीजिए, मैं इस नाम का खाता ढूँढ नहीं पाया।');
  }
}

// 4. लेन-देन CRUD
function addTransaction(name, amount, type, isoDateTime) {
  const newEntry = {
    id: 'TX-' + Date.now(),
    name: name.trim(),
    amount: parseFloat(amount),
    type: type,
    timestamp: isoDateTime || new Date().toISOString()
  };
  transactions.unshift(newEntry);
  saveAndRender();
}

function updateTransaction(id, name, amount, type, isoDateTime) {
  const index = transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    transactions[index] = {
      ...transactions[index],
      name: name.trim(),
      amount: parseFloat(amount),
      type: type,
      timestamp: isoDateTime
    };
    saveAndRender();
    speak('एंट्री सफलतापूर्वक अपडेट हो गई है।');
  }
}

function deleteTransaction(id) {
  if (confirm('क्या आप सच में इस एंट्री को हटाना चाहते हैं?')) {
    transactions = transactions.filter(t => t.id !== id);
    saveAndRender();
  }
}

// 5. मैन्युअल फॉर्म इवेंट
addEntryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = manualName.value;
  const amount = manualAmount.value;
  const type = manualType.value;
  const dateVal = new Date(manualDateTime.value).toISOString();

  addTransaction(name, amount, type, dateVal);
  addEntryForm.reset();
  setCurrentDateTimeInput(manualDateTime);
});

// 6. एडिट मोडल हैंडलिंग
function openEditDialog(id) {
  const item = transactions.find(t => t.id === id);
  if (!item) return;

  editEntryId.value = item.id;
  editName.value = item.name;
  editAmount.value = item.amount;
  editType.value = item.type;

  const dateObj = new Date(item.timestamp);
  const offset = dateObj.getTimezoneOffset() * 60000;
  editDateTime.value = new Date(dateObj.getTime() - offset).toISOString().slice(0, 16);

  editModal.classList.add('show');
}

function closeEditDialog() {
  editModal.classList.remove('show');
}

closeEditModal.addEventListener('click', closeEditDialog);
cancelEditBtn.addEventListener('click', closeEditDialog);

editEntryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = editEntryId.value;
  const name = editName.value;
  const amount = editAmount.value;
  const type = editType.value;
  const dt = new Date(editDateTime.value).toISOString();

  updateTransaction(id, name, amount, type, dt);
  closeEditDialog();
});

// 7. WhatsApp रिमाइंडर लिंक जनरेटर
function sendWhatsAppReminder(name, amount) {
  const textMsg = encodeURIComponent(
    `नमस्ते ${name} जी, आपके खाताबुक में ₹${amount.toLocaleString('en-IN')} का बकाया शेष है। कृपया समय पर भुगतान करने का कष्ट करें। धन्यवाद!`
  );
  window.open(`https://wa.me/?text=${textMsg}`, '_blank');
}

// 8. रेंडरिंग और फिल्टर
function saveAndRender() {
  localStorage.setItem('khataTransactionsPro', JSON.stringify(transactions));
  renderTable();
  updateSummary();
  updateCustomerDropdown();
}

function renderTable() {
  const search = searchInput.value.toLowerCase();
  const filter = filterType.value;

  ledgerBody.innerHTML = '';

  const filtered = transactions.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search);
    const matchesType = (filter === 'ALL') || (item.type === filter);
    return matchesSearch && matchesType;
  });

  if (filtered.length === 0) {
    ledgerBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 24px;">कोई लेन-देन नहीं मिला</td></tr>`;
    return;
  }

  filtered.forEach(item => {
    const isIncome = item.type === 'IN';
    const formattedDate = new Date(item.timestamp).toLocaleString('hi-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formattedDate}</td>
      <td><strong>${item.name}</strong></td>
      <td><span class="tag ${isIncome ? 'tag-in' : 'tag-out'}">${isIncome ? 'जमा (IN)' : 'उधार (OUT)'}</span></td>
      <td class="${isIncome ? 'amount-in' : 'amount-out'}">₹${item.amount.toLocaleString('en-IN')}</td>
      <td class="text-right">
        <div class="action-buttons">
          ${!isIncome ? `<button class="btn-icon btn-whatsapp" title="WhatsApp रिमाइंडर" onclick="sendWhatsAppReminder('${item.name}',${item.amount})">💬 WhatsApp</button>` : ''}
          <button class="btn-icon" title="एडिट करें" onclick="openEditDialog('${item.id}')">✏️</button>
          <button class="btn-icon" title="हटाएं" onclick="deleteTransaction('${item.id}')">🗑️</button>
        </div>
      </td>
    `;
    ledgerBody.appendChild(tr);
  });
}

function updateSummary() {
  let inSum = 0;
  let outSum = 0;

  transactions.forEach(t => {
    if (t.type === 'IN') inSum += t.amount;
    else outSum += t.amount;
  });

  const net = inSum - outSum;

  totalInDisplay.innerText = `₹${inSum.toLocaleString('en-IN')}`;
  totalOutDisplay.innerText = `₹${outSum.toLocaleString('en-IN')}`;
  netBalanceDisplay.innerText = `₹${net.toLocaleString('en-IN')}`;
}

// 9. प्रिंट इंजन (A4 और 80mm थर्मल रोल)
openPrintModalBtn.addEventListener('click', () => {
  printChoiceModal.classList.add('show');
});
closePrintModal.addEventListener('click', () => {
  printChoiceModal.classList.remove('show');
});

function updateCustomerDropdown() {
  const uniqueNames = [...new Set(transactions.map(t => t.name))];
  printCustomerFilter.innerHTML = '<option value="ALL">-- सभी ग्राहक (Full Ledger) --</option>';
  uniqueNames.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.innerText = name;
    printCustomerFilter.appendChild(opt);
  });
}

function getPrintableData() {
  const selectedCust = printCustomerFilter.value;
  if (selectedCust === 'ALL') {
    return { title: 'संपूर्ण खाताबुक रिपोर्ट', data: transactions };
  } else {
    return {
      title: `खाता विवरण: ${selectedCust}`,
      data: transactions.filter(t => t.name === selectedCust)
    };
  }
}

// (A) A4 प्रिंट जनरेशन
triggerPrintA4.addEventListener('click', () => {
  const { title, data } = getPrintableData();
  document.body.className = 'print-mode-a4';

  let totalIn = 0;
  let totalOut = 0;

  let tableRows = data.map(item => {
    if (item.type === 'IN') totalIn += item.amount;
    else totalOut += item.amount;

    return `
      <tr>
        <td>${new Date(item.timestamp).toLocaleString('hi-IN')}</td>
        <td>${item.name}</td>
        <td>${item.type === 'IN' ? 'जमा' : 'उधार'}</td>
        <td style="text-align:right;">₹${item.amount.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  printArea.innerHTML = `
    <div style="padding: 10px;">
      <h2 style="margin-bottom: 4px;">खाताबुक प्रो - लेज़र स्टेटमेंट</h2>
      <p style="color:#555; font-size:12px;">रिपोर्ट: ${title} | प्रिंट दिनांक: ${new Date().toLocaleString('hi-IN')}</p>
      <hr style="margin: 10px 0; border: 0; border-top: 1px solid #ccc;">
      <table>
        <thead>
          <tr>
            <th>तारीख और समय</th>
            <th>ग्राहक</th>
            <th>प्रकार</th>
            <th style="text-align:right;">राशि</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div style="margin-top: 20px; float: right; width: 260px; font-size: 13px;">
        <p>कुल जमा: <strong>₹${totalIn.toFixed(2)}</strong></p>
        <p>कुल उधार: <strong>₹${totalOut.toFixed(2)}</strong></p>
        <hr>
        <p style="font-size: 15px;">शुद्ध बैलेंस: <strong>₹${(totalIn - totalOut).toFixed(2)}</strong></p>
      </div>
    </div>
  `;

  printChoiceModal.classList.remove('show');
  window.print();
});

// (B) 80mm रोल स्लिप जनरेशन
triggerPrintRoll.addEventListener('click', () => {
  const { title, data } = getPrintableData();
  document.body.className = 'print-mode-roll';

  let totalIn = 0;
  let totalOut = 0;

  let rollRows = data.map(item => {
    if (item.type === 'IN') totalIn += item.amount;
    else totalOut += item.amount;

    const shortDate = new Date(item.timestamp).toLocaleDateString('hi-IN', { day:'2-digit', month:'2-digit' });
    return `
      <tr>
        <td>${shortDate} ${item.name.slice(0, 10)}</td>
        <td>${item.type === 'IN' ? 'IN' : 'OUT'}</td>
        <td style="text-align:right;">${item.amount}</td>
      </tr>
    `;
  }).join('');

  printArea.innerHTML = `
    <div class="thermal-ticket">
      <div class="center">
        <h3 style="margin:0;">खाताबुक रसीद</h3>
        <p style="font-size:9px;">${title}</p>
        <p style="font-size:9px;">${new Date().toLocaleDateString('hi-IN')}</p>
      </div>
      <div style="border-top:1px dashed #000; margin:4px 0;"></div>
      <table>
        <thead>
          <tr>
            <th>विवरण</th>
            <th>टाइप</th>
            <th style="text-align:right;">राशि</th>
          </tr>
        </thead>
        <tbody>${rollRows}</tbody>
      </table>
      <div style="border-top:1px dashed #000; margin:6px 0;"></div>
      <div style="font-size:10px;">
        <div>जमा: ₹${totalIn}</div>
        <div>उधार: ₹${totalOut}</div>
        <div style="font-weight:bold; font-size:11px; margin-top:2px;">बैलेंस: ₹${totalIn - totalOut}</div>
      </div>
      <div class="center" style="margin-top:8px; font-size:9px;">
        ** धन्यवाद **
      </div>
    </div>
  `;

  printChoiceModal.classList.remove('show');
  window.print();
});

// 10. CSV / Excel एक्सपोर्ट
exportCsvBtn.addEventListener('click', () => {
  if (transactions.length === 0) {
    alert('एक्सपोर्ट के लिए कोई डेटा नहीं है।');
    return;
  }

  let csv = 'ID,Date,Customer Name,Type,Amount\n';
  transactions.forEach(t => {
    csv += `"${t.id}","${t.timestamp}","${t.name}","${t.type}",${t.amount}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `khatabook_export_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// लाइव सर्च व फिल्टर इवेंट्स
searchInput.addEventListener('input', renderTable);
filterType.addEventListener('change', renderTable);

// इनिशियलाइज़
window.onload = () => {
  saveAndRender();
};
