const CHECKPOINTS = ["Start", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "Ziel"];
const ORDERED_CHECKPOINTS = ["30", "31", "32", "33", "34", "35", "36", "37", "38", "39"];

let state = {
  participants: [],
  activeParticipantId: null,
  currentTime: 0,
  isScanning: false,
  scannerInstance: null,
};

window.createApp = function(container) {
  loadStateFromLocalStorage();
  render(container);
  startTimerLoop();
}

function loadStateFromLocalStorage() {
  const savedParticipants = localStorage.getItem('orienteeringParticipants');
  const savedActiveId = localStorage.getItem('orienteeringActiveParticipant');
  
  if (savedParticipants) {
    state.participants = JSON.parse(savedParticipants);
  }
  if (savedActiveId) {
    state.activeParticipantId = savedActiveId;
  }
}

function saveStateToLocalStorage() {
  localStorage.setItem('orienteeringParticipants', JSON.stringify(state.participants));
  if (state.activeParticipantId) {
    localStorage.setItem('orienteeringActiveParticipant', state.activeParticipantId);
  }
}

function getActiveParticipant() {
  return state.participants.find(p => p.id === state.activeParticipantId);
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

function playSound(frequency, duration = 200) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration / 1000);
}

function showToast(message, type = 'info', description = '') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-message">${message}</div>
      ${description ? `<div class="toast-description">${description}</div>` : ''}
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function startTimerLoop() {
  setInterval(() => {
    const active = getActiveParticipant();
    if (active?.startTime) {
      state.currentTime = Date.now() - active.startTime;
      updateTimerDisplay();
    }
  }, 10);
}

function handleAddParticipant(name) {
  const newParticipant = {
    id: Date.now().toString(),
    name,
    results: [],
    startTime: null,
    scannedCheckpoints: [],
  };
  state.participants.push(newParticipant);
  state.activeParticipantId = newParticipant.id;
  saveStateToLocalStorage();
  showToast(`${name} hinzugefügt`, 'success');
  render(document.getElementById('app'));
}

function handleSelectParticipant(id) {
  state.activeParticipantId = id;
  saveStateToLocalStorage();
  const participant = state.participants.find(p => p.id === id);
  if (participant) {
    showToast(`${participant.name} ausgewählt`, 'info');
  }
  render(document.getElementById('app'));
}

function updateActiveParticipant(updates) {
  if (!state.activeParticipantId) return;
  state.participants = state.participants.map(p => 
    p.id === state.activeParticipantId ? { ...p, ...updates } : p
  );
  saveStateToLocalStorage();
}

function handleScan(decodedText) {
  const activeParticipant = getActiveParticipant();
  
  if (!activeParticipant) {
    showToast('Bitte wähle zuerst einen Teilnehmer!', 'error');
    playSound(200, 300);
    return;
  }

  const hasStarted = activeParticipant.scannedCheckpoints.includes('Start');
  const hasScannedAllCheckpoints = ORDERED_CHECKPOINTS.every(cp => 
    activeParticipant.scannedCheckpoints.includes(cp)
  );
  const lastScannedCheckpoint = activeParticipant.scannedCheckpoints[activeParticipant.scannedCheckpoints.length - 1];
  const isSameAsLast = decodedText === lastScannedCheckpoint;

  if (decodedText === 'Start') {
    if (hasStarted) {
      showToast('Start wurde bereits gescannt!', 'error');
      playSound(200, 300);
      return;
    }
  } else if (decodedText === 'Ziel') {
    if (!hasStarted) {
      showToast('Bitte zuerst Start scannen!', 'error');
      playSound(200, 300);
      return;
    }
    if (!hasScannedAllCheckpoints) {
      const remaining = ORDERED_CHECKPOINTS.filter(cp => 
        !activeParticipant.scannedCheckpoints.includes(cp)
      );
      showToast('Noch nicht alle Posten gescannt!', 'error', `Fehlende Posten: ${remaining.join(', ')}`);
      playSound(200, 300);
      return;
    }
  } else {
    if (!hasStarted) {
      showToast('Bitte zuerst Start scannen!', 'error');
      playSound(200, 300);
      return;
    }
    if (!ORDERED_CHECKPOINTS.includes(decodedText)) {
      showToast(`Ungültiger Posten: ${decodedText}`, 'error');
      playSound(200, 300);
      return;
    }
    if (isSameAsLast) {
      showToast(`Posten ${decodedText} wurde gerade erst gescannt!`, 'error');
      playSound(200, 300);
      return;
    }
  }

  playSound(800, 150);
  if (state.isScanning) {
    stopScanner();
  }

  if (decodedText === 'Start') {
    const now = Date.now();
    updateActiveParticipant({
      startTime: now,
      results: [{ checkpoint: 'Start', time: '00:00.00' }],
      scannedCheckpoints: ['Start'],
    });
    showToast('Timer gestartet!', 'success');
  } else if (decodedText === 'Ziel') {
    const finalTime = Date.now() - activeParticipant.startTime;
    updateActiveParticipant({
      results: [...activeParticipant.results, { checkpoint: 'Ziel', time: formatTime(finalTime) }],
      scannedCheckpoints: [...activeParticipant.scannedCheckpoints, 'Ziel'],
      startTime: null,
    });
    showToast('Ziel erreicht! Timer gestoppt.', 'success');
  } else {
    const interimTime = Date.now() - activeParticipant.startTime;
    updateActiveParticipant({
      results: [...activeParticipant.results, { checkpoint: decodedText, time: formatTime(interimTime) }],
      scannedCheckpoints: [...activeParticipant.scannedCheckpoints, decodedText],
    });
    showToast(`Posten ${decodedText} erfasst!`, 'success');
  }
  
  render(document.getElementById('app'));
}

async function startScanner() {
  try {
    const html5QrCode = new Html5Qrcode('qr-reader');
    state.scannerInstance = html5QrCode;

    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => handleScan(decodedText),
      () => {}
    );
    state.isScanning = true;
    updateScannerButton();
  } catch (err) {
    showToast('Kamera konnte nicht gestartet werden.', 'error');
    console.error(err);
  }
}

async function stopScanner() {
  if (state.scannerInstance) {
    try {
      await state.scannerInstance.stop();
      state.isScanning = false;
      updateScannerButton();
    } catch (err) {
      console.error(err);
    }
  }
}

function updateScannerButton() {
  const btn = document.getElementById('scanner-toggle-btn');
  if (btn) {
    btn.textContent = state.isScanning ? 'Scanner stoppen' : 'Scanner starten';
    btn.className = state.isScanning 
      ? 'btn btn-destructive w-full' 
      : 'btn btn-primary w-full';
  }
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('timer-display');
  if (timerEl) {
    timerEl.textContent = formatTime(state.currentTime);
  }
}

function handleReset() {
  const active = getActiveParticipant();
  if (!active) return;
  updateActiveParticipant({
    results: [],
    startTime: null,
    scannedCheckpoints: [],
  });
  showToast(`${active.name} zurückgesetzt`, 'info');
  render(document.getElementById('app'));
}

function handleResetAll() {
  state.participants = [];
  state.activeParticipantId = null;
  localStorage.removeItem('orienteeringParticipants');
  localStorage.removeItem('orienteeringActiveParticipant');
  showToast('Alles zurückgesetzt', 'info');
  render(document.getElementById('app'));
}

function render(container) {
  const active = getActiveParticipant();
  
  // Clear container
  container.innerHTML = '';
  
  // Main wrapper
  const mainWrapper = document.createElement('div');
  mainWrapper.className = 'min-h-screen bg-cover bg-center bg-fixed relative';
  mainWrapper.style.backgroundImage = 'url(./src/assets/orienteering-map-bg.jpg)';
  
  // Backdrop overlay
  const backdrop = document.createElement('div');
  backdrop.className = 'absolute inset-0 bg-background/80 backdrop-blur-sm';
  mainWrapper.appendChild(backdrop);
  
  // Content container
  const contentContainer = document.createElement('div');
  contentContainer.className = 'relative z-10 container mx-auto px-4 py-8 max-w-5xl';
  
  // Header
  const header = document.createElement('header');
  header.className = 'text-center mb-8';
  
  const h1 = document.createElement('h1');
  h1.className = 'text-3xl md:text-5xl font-bold text-foreground mb-2';
  h1.textContent = 'Christians 50-Jahre-Jubiläum';
  header.appendChild(h1);
  
  const h2 = document.createElement('h2');
  h2.className = 'text-xl md:text-2xl text-primary font-semibold';
  h2.textContent = 'GKZ Büro OL';
  header.appendChild(h2);
  
  contentContainer.appendChild(header);
  
  // Participant section
  const participantSection = document.createElement('div');
  participantSection.className = 'mb-6';
  
  const participantCard = document.createElement('div');
  participantCard.className = 'card p-4 bg-card/95 backdrop-blur';
  
  const participantHeader = document.createElement('div');
  participantHeader.className = 'flex items-center gap-2 mb-3';
  participantHeader.innerHTML = `
    <svg class="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
    </svg>
  `;
  
  const h3 = document.createElement('h3');
  h3.className = 'font-semibold text-foreground';
  h3.textContent = 'Teilnehmer';
  participantHeader.appendChild(h3);
  participantCard.appendChild(participantHeader);
  
  const participantInputs = document.createElement('div');
  participantInputs.className = 'space-y-3';
  
  const inputRow = document.createElement('div');
  inputRow.className = 'flex gap-2';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'participant-name';
  nameInput.placeholder = 'Name eingeben...';
  nameInput.className = 'input flex-1';
  inputRow.appendChild(nameInput);
  
  const addBtn = document.createElement('button');
  addBtn.id = 'add-participant-btn';
  addBtn.className = 'btn btn-icon';
  addBtn.innerHTML = `
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
    </svg>
  `;
  inputRow.appendChild(addBtn);
  participantInputs.appendChild(inputRow);
  
  if (state.participants.length > 0) {
    const select = document.createElement('select');
    select.id = 'participant-select';
    select.className = 'input w-full';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Teilnehmer wählen...';
    select.appendChild(defaultOption);
    
    state.participants.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = p.name;
      if (p.id === state.activeParticipantId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    
    participantInputs.appendChild(select);
  }
  
  participantCard.appendChild(participantInputs);
  participantSection.appendChild(participantCard);
  // Timer Card (standalone)
  const timerSection = document.createElement('div');
  timerSection.className = 'mb-6';
  
  // Timer Card
  const timerCard = document.createElement('div');
  timerCard.className = 'card p-8 bg-card/95 backdrop-blur text-center';
  
  const timerHeaderDiv = document.createElement('div');
  timerHeaderDiv.className = 'flex items-center justify-center gap-3 mb-2';
  
  const clockIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  clockIcon.setAttribute('class', active?.startTime ? 'h-8 w-8 text-accent animate-pulse' : 'h-8 w-8 text-muted-foreground');
  clockIcon.setAttribute('fill', 'none');
  clockIcon.setAttribute('stroke', 'currentColor');
  clockIcon.setAttribute('viewBox', '0 0 24 24');
  clockIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>';
  timerHeaderDiv.appendChild(clockIcon);
  
  const timerH3 = document.createElement('h3');
  timerH3.className = 'text-lg font-semibold text-foreground';
  timerH3.textContent = 'Timer' + (active ? ` - ${active.name}` : '');
  timerHeaderDiv.appendChild(timerH3);
  timerCard.appendChild(timerHeaderDiv);
  
  const timerDisplay = document.createElement('div');
  timerDisplay.id = 'timer-display';
  timerDisplay.className = 'text-5xl font-bold font-mono text-foreground mt-4';
  timerDisplay.textContent = active?.startTime ? formatTime(state.currentTime) : '00:00.00';
  timerCard.appendChild(timerDisplay);
  
  const timerStatus = document.createElement('p');
  timerStatus.className = 'text-sm text-muted-foreground mt-2';
  timerStatus.textContent = active?.startTime ? 'Läuft...' : 'Bereit';
  timerCard.appendChild(timerStatus);
  
  timerSection.appendChild(timerCard);
  
  // Status Section (standalone)
  const statusSection = document.createElement('div');
  statusSection.className = 'mb-6';
  
  const statusCard = document.createElement('div');
  statusCard.className = 'bg-card/95 backdrop-blur rounded-lg p-4 border border-border';
  
  const statusH3 = document.createElement('h3');
  statusH3.className = 'font-semibold mb-2 text-foreground';
  statusH3.textContent = 'Status:';
  statusCard.appendChild(statusH3);
  
  const statusText = document.createElement('p');
  statusText.className = 'text-2xl font-bold text-accent';
  if (active) {
    if (!active.scannedCheckpoints.includes('Start')) {
      statusText.textContent = 'Start scannen';
    } else if (active.scannedCheckpoints.includes('Ziel')) {
      statusText.textContent = 'Fertig!';
    } else {
      const scannedCount = new Set(active.scannedCheckpoints.filter(cp => ORDERED_CHECKPOINTS.includes(cp))).size;
      statusText.textContent = `${scannedCount}/10 Posten`;
    }
  } else {
    statusText.textContent = '-';
  }
  statusCard.appendChild(statusText);
  
  if (active && active.scannedCheckpoints.includes('Start') && !active.scannedCheckpoints.includes('Ziel')) {
    const missingText = document.createElement('p');
    missingText.className = 'text-sm text-muted-foreground mt-2';
    const missingCheckpoints = ORDERED_CHECKPOINTS.filter(cp => !active.scannedCheckpoints.includes(cp));
    missingText.textContent = `Fehlende Posten: ${missingCheckpoints.length > 0 ? missingCheckpoints.join(', ') : 'Keine - Ziel scannen!'}`;
  statusCard.appendChild(missingText);
  }
  
  const buttonRow = document.createElement('div');
  buttonRow.className = 'flex gap-2';
  
  const resetBtn = document.createElement('button');
  resetBtn.id = 'reset-btn';
  resetBtn.className = 'btn btn-outline flex-1';
  if (!active) resetBtn.disabled = true;
  resetBtn.innerHTML = `
    <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg>
    Teilnehmer zurücksetzen
  `;
  buttonRow.appendChild(resetBtn);
  
  const resetAllBtn = document.createElement('button');
  resetAllBtn.id = 'reset-all-btn';
  resetAllBtn.className = 'btn btn-destructive flex-1';
  resetAllBtn.innerHTML = `
    <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg>
    Alles zurücksetzen
  `;
  buttonRow.appendChild(resetAllBtn);
  
  statusCard.appendChild(buttonRow);
  statusSection.appendChild(statusCard);
  
  // Scanner Section (standalone)
  const scannerSection = document.createElement('div');
  scannerSection.className = 'mb-6';
  
  // Scanner Card
  const scannerCard = document.createElement('div');
  scannerCard.className = 'card p-6 bg-card/95 backdrop-blur';
  
  const scannerSpace = document.createElement('div');
  scannerSpace.className = 'space-y-4';
  
  const qrReader = document.createElement('div');
  qrReader.id = 'qr-reader';
  qrReader.className = 'w-full min-h-[300px] rounded-lg overflow-hidden bg-muted/30';
  scannerSpace.appendChild(qrReader);
  
  const scannerToggleBtn = document.createElement('button');
  scannerToggleBtn.id = 'scanner-toggle-btn';
  scannerToggleBtn.className = 'btn btn-primary w-full';
  scannerToggleBtn.textContent = 'Scanner starten';
  scannerSpace.appendChild(scannerToggleBtn);
  
  scannerCard.appendChild(scannerSpace);
  scannerSection.appendChild(scannerCard);
  
  // Results Section (standalone)
  const resultsSection = document.createElement('div');
  resultsSection.className = 'mb-6';
  
  const resultsCard = document.createElement('div');
  resultsCard.className = 'card overflow-hidden bg-card/95 backdrop-blur';
  
  const resultsDiv = document.createElement('div');
  resultsDiv.className = 'p-6';
  
  const resultsH2 = document.createElement('h2');
  resultsH2.className = 'text-2xl font-bold mb-4 text-foreground';
  resultsH2.textContent = 'Resultate' + (active ? ` - ${active.name}` : '');
  resultsDiv.appendChild(resultsH2);
  
  const tableContainer = document.createElement('div');
  tableContainer.className = 'rounded-md border border-border overflow-hidden';
  
  const table = document.createElement('table');
  table.className = 'w-full';
  
  const thead = document.createElement('thead');
  thead.className = 'bg-primary/10';
  const headerRow = document.createElement('tr');
  
  const th1 = document.createElement('th');
  th1.className = 'h-12 px-4 text-left font-bold text-foreground';
  th1.textContent = 'Postennummer';
  headerRow.appendChild(th1);
  
  const th2 = document.createElement('th');
  th2.className = 'h-12 px-4 text-right font-bold text-foreground';
  th2.textContent = 'Zeit';
  headerRow.appendChild(th2);
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  
  if (active && active.results.length > 0) {
    active.results.forEach(result => {
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-muted/50';
      
      const td1 = document.createElement('td');
      td1.className = 'p-4 font-medium';
      td1.textContent = result.checkpoint;
      tr.appendChild(td1);
      
      const td2 = document.createElement('td');
      td2.className = 'p-4 text-right font-mono';
      td2.textContent = result.time;
      tr.appendChild(td2);
      
      tbody.appendChild(tr);
    });
  } else {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 2;
    td.className = 'p-8 text-center text-muted-foreground';
    td.textContent = 'Noch keine Posten gescannt';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  resultsDiv.appendChild(tableContainer);
  resultsCard.appendChild(resultsDiv);
  resultsSection.appendChild(resultsCard);
  
  // Append sections in requested order
  contentContainer.appendChild(participantSection);
  contentContainer.appendChild(scannerSection);
  contentContainer.appendChild(timerSection);
  contentContainer.appendChild(statusSection);
  contentContainer.appendChild(resultsSection);
  
  mainWrapper.appendChild(contentContainer);
  container.appendChild(mainWrapper);
  
  // Attach event listeners
  const addBtnEl = document.getElementById('add-participant-btn');
  const nameInputEl = document.getElementById('participant-name');
  const selectEl = document.getElementById('participant-select');
  const scannerBtnEl = document.getElementById('scanner-toggle-btn');
  const resetBtnEl = document.getElementById('reset-btn');
  const resetAllBtnEl = document.getElementById('reset-all-btn');

  if (addBtnEl && nameInputEl) {
    addBtnEl.onclick = () => {
      const name = nameInputEl.value.trim();
      if (name) {
        handleAddParticipant(name);
        nameInputEl.value = '';
      }
    };
    nameInputEl.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const name = nameInputEl.value.trim();
        if (name) {
          handleAddParticipant(name);
          nameInputEl.value = '';
        }
      }
    };
  }

  if (selectEl) {
    selectEl.onchange = (e) => {
      if (e.target.value) {
        handleSelectParticipant(e.target.value);
      }
    };
  }

  if (scannerBtnEl) {
    scannerBtnEl.onclick = () => {
      if (state.isScanning) {
        stopScanner();
      } else {
        startScanner();
      }
    };
  }

  if (resetBtnEl) {
    resetBtnEl.onclick = handleReset;
  }

  if (resetAllBtnEl) {
    resetAllBtnEl.onclick = handleResetAll;
  }
}
