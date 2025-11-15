import { Html5Qrcode } from 'html5-qrcode';
import orienteeringBg from './assets/orienteering-map-bg.jpg';

const CHECKPOINTS = ["Start", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Ziel"];
const ORDERED_CHECKPOINTS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

let state = {
  participants: [],
  activeParticipantId: null,
  currentTime: 0,
  isScanning: false,
  scannerInstance: null,
};

export function createApp(container) {
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
  
  container.innerHTML = `
    <div class="min-h-screen bg-cover bg-center bg-fixed relative" style="background-image: url(${orienteeringBg})">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>
      <div class="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        <header class="text-center mb-8">
          <h1 class="text-3xl md:text-5xl font-bold text-foreground mb-2">Christians 50-Jahre-Jubiläum</h1>
          <h2 class="text-xl md:text-2xl text-primary font-semibold">GKZ Büro OL</h2>
        </header>

        <div class="mb-6">
          <div class="card p-4 bg-card/95 backdrop-blur">
            <div class="flex items-center gap-2 mb-3">
              <svg class="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <h3 class="font-semibold text-foreground">Teilnehmer</h3>
            </div>
            <div class="space-y-3">
              <div class="flex gap-2">
                <input 
                  type="text" 
                  id="participant-name" 
                  placeholder="Name eingeben..." 
                  class="input flex-1"
                />
                <button id="add-participant-btn" class="btn btn-icon">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                  </svg>
                </button>
              </div>
              ${state.participants.length > 0 ? `
                <select id="participant-select" class="input w-full">
                  <option value="">Teilnehmer wählen...</option>
                  ${state.participants.map(p => `
                    <option value="${p.id}" ${p.id === state.activeParticipantId ? 'selected' : ''}>
                      ${p.name}
                    </option>
                  `).join('')}
                </select>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="grid gap-6 md:grid-cols-2 mb-6">
          <div class="card p-8 bg-card/95 backdrop-blur text-center">
            <div class="flex items-center justify-center gap-3 mb-2">
              <svg class="h-8 w-8 ${active?.startTime ? 'text-accent animate-pulse' : 'text-muted-foreground'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3 class="text-lg font-semibold text-foreground">
                Timer ${active ? `- ${active.name}` : ''}
              </h3>
            </div>
            <div id="timer-display" class="text-5xl font-bold font-mono text-foreground mt-4">
              ${active?.startTime ? formatTime(state.currentTime) : '00:00.00'}
            </div>
            <p class="text-sm text-muted-foreground mt-2">
              ${active?.startTime ? 'Läuft...' : 'Bereit'}
            </p>
          </div>

          <div class="flex flex-col gap-4">
            <div class="bg-card/95 backdrop-blur rounded-lg p-4 border border-border">
              <h3 class="font-semibold mb-2 text-foreground">Status:</h3>
              <p class="text-2xl font-bold text-accent">
                ${active ? (
                  !active.scannedCheckpoints.includes('Start') 
                    ? 'Start scannen'
                    : active.scannedCheckpoints.includes('Ziel')
                    ? 'Fertig!'
                    : `${new Set(active.scannedCheckpoints.filter(cp => ORDERED_CHECKPOINTS.includes(cp))).size}/10 Posten`
                ) : '-'}
              </p>
              ${active && active.scannedCheckpoints.includes('Start') && !active.scannedCheckpoints.includes('Ziel') ? `
                <p class="text-sm text-muted-foreground mt-2">
                  Fehlende Posten: ${ORDERED_CHECKPOINTS.filter(cp => !active.scannedCheckpoints.includes(cp)).join(', ') || 'Keine - Ziel scannen!'}
                </p>
              ` : ''}
            </div>
            <div class="flex gap-2">
              <button id="reset-btn" class="btn btn-outline flex-1" ${!active ? 'disabled' : ''}>
                <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Teilnehmer zurücksetzen
              </button>
              <button id="reset-all-btn" class="btn btn-destructive flex-1">
                <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Alles zurücksetzen
              </button>
            </div>
          </div>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <div class="card p-6 bg-card/95 backdrop-blur">
            <div class="space-y-4">
              <div id="qr-reader" class="w-full min-h-[300px] rounded-lg overflow-hidden bg-muted/30"></div>
              <button id="scanner-toggle-btn" class="btn btn-primary w-full">
                Scanner starten
              </button>
            </div>
          </div>

          <div class="card overflow-hidden bg-card/95 backdrop-blur">
            <div class="p-6">
              <h2 class="text-2xl font-bold mb-4 text-foreground">
                Resultate ${active ? `- ${active.name}` : ''}
              </h2>
              <div class="rounded-md border border-border overflow-hidden">
                <table class="w-full">
                  <thead class="bg-primary/10">
                    <tr>
                      <th class="h-12 px-4 text-left font-bold text-foreground">Postennummer</th>
                      <th class="h-12 px-4 text-right font-bold text-foreground">Zeit</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${active && active.results.length > 0 ? active.results.map(result => `
                      <tr class="border-b hover:bg-muted/50">
                        <td class="p-4 font-medium">${result.checkpoint}</td>
                        <td class="p-4 text-right font-mono">${result.time}</td>
                      </tr>
                    `).join('') : `
                      <tr>
                        <td colspan="2" class="p-8 text-center text-muted-foreground">
                          Noch keine Posten gescannt
                        </td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  const addBtn = document.getElementById('add-participant-btn');
  const nameInput = document.getElementById('participant-name');
  const selectEl = document.getElementById('participant-select');
  const scannerBtn = document.getElementById('scanner-toggle-btn');
  const resetBtn = document.getElementById('reset-btn');
  const resetAllBtn = document.getElementById('reset-all-btn');

  if (addBtn && nameInput) {
    addBtn.onclick = () => {
      const name = nameInput.value.trim();
      if (name) {
        handleAddParticipant(name);
        nameInput.value = '';
      }
    };
    nameInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const name = nameInput.value.trim();
        if (name) {
          handleAddParticipant(name);
          nameInput.value = '';
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

  if (scannerBtn) {
    scannerBtn.onclick = () => {
      if (state.isScanning) {
        stopScanner();
      } else {
        startScanner();
      }
    };
  }

  if (resetBtn) {
    resetBtn.onclick = handleReset;
  }

  if (resetAllBtn) {
    resetAllBtn.onclick = handleResetAll;
  }
}
