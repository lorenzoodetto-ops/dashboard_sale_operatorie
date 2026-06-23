const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Status Sale Operatorie</title>
    <style>
        /* Ottimizzazioni Mobile e TV */
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #1e1e1e; color: white; margin: 0; padding: 10px; user-select: none; -webkit-user-select: none; }
        h1 { text-align: center; color: #4facfe; font-size: 1.5em; margin-bottom: 5px;}
        
        /* Pallino di Connessione */
        #connection-status { position: fixed; top: 10px; right: 10px; display: flex; align-items: center; font-size: 0.9em; font-weight: bold; background: #333; padding: 5px 10px; border-radius: 20px; z-index: 5000;}
        .dot { height: 12px; width: 12px; border-radius: 50%; display: inline-block; margin-right: 8px; }
        .dot-green { background-color: #4caf50; box-shadow: 0 0 8px #4caf50;}
        .dot-red { background-color: #f44336; box-shadow: 0 0 8px #f44336;}

        table { width: 100%; border-collapse: collapse; margin-top: 5px; background-color: #2b2b2b; }
        th, td { padding: 6px 5px; text-align: center; border: 1px solid #444; } /* Padding ridotto per recuperare spazio verticale */
        th { background-color: #333; font-size: 1em; }
        
        /* Pulsanti Nativi per Mobile - Altezze ridotte per schermi TV */
        .action-btn { width: 100%; height: 45px; border: none; border-radius: 8px; font-size: 1em; font-weight: bold; cursor: pointer; touch-action: manipulation; transition: 0.1s; display: flex; align-items: center; justify-content: center; }
        .action-btn:active { transform: scale(0.95); }
        .readonly-btn { width: 100%; height: 45px; border: none; border-radius: 8px; font-size: 1em; font-weight: bold; display: flex; align-items: center; justify-content: center; opacity: 0.9; }
        
        .bg-red { background-color: #d32f2f; color: white; }
        .bg-green { background-color: #388e3c; color: white; }
        .bg-dark { background-color: #444; color: #888; border: 1px solid #555; }
        
        /* Font grandezze Timer leggermente ridotte */
        .text-green { color: #4caf50; font-weight: bold; font-size: 2em;}
        .text-yellow { color: #ffeb3b; font-weight: bold; font-size: 2em;}
        .text-red { color: #f44336; font-weight: bold; font-size: 2em;}
        
        #login-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #1e1e1e; z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;}
        .btn-login { background: #4facfe; color: white; border: none; padding: 15px; width: 100%; max-width: 300px; margin: 10px; font-size: 1.1em; border-radius: 5px; cursor: pointer; font-weight: bold; touch-action: manipulation;}
        .room-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 20px; width: 100%; max-width: 400px;}
        .btn-room { background: #333; border: 2px solid #4facfe; color: white; padding: 20px 10px; font-size: 1.8em; border-radius: 8px; cursor: pointer; touch-action: manipulation;}
        
        #pin-modal, #timer-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 2000; align-items: center; justify-content: center; flex-direction: column; }
        .pin-box { background: #2b2b2b; padding: 25px; border-radius: 10px; text-align: center; border: 2px solid #4facfe; width: 90%; max-width: 320px; box-sizing: border-box;}
        .modal-input { font-size: 1.2em; padding: 12px; width: 100%; text-align: center; margin-bottom: 15px; border-radius: 5px; border: none; box-sizing: border-box;}
        #pin-input { letter-spacing: 10px; font-weight: bold; }
        .pin-btn { font-size: 1.1em; padding: 12px; margin: 5px 0; width: 100%; cursor: pointer; border-radius: 5px; border: none; font-weight: bold; touch-action: manipulation;}
        .btn-confirm { background: #388e3c; color: white; }
        .btn-cancel { background: #d32f2f; color: white; }
    </style>
</head>
<body>

    <div id="connection-status">
        <span id="conn-dot" class="dot dot-red"></span>
        <span id="conn-text">Disconnesso</span>
    </div>

    <!-- Modale Inserimento PIN -->
    <div id="pin-modal">
        <div class="pin-box">
            <h2 style="margin-top: 0;">Sala <span id="pin-room-display"></span></h2>
            <input type="text" id="nurse-name-input" class="modal-input" placeholder="Tuo Nome (Nurse)" autocomplete="off">
            <input type="password" id="pin-input" class="modal-input" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="PIN">
            <button class="pin-btn btn-confirm" onclick="verifyPin()">Entra in Sala</button>
            <button class="pin-btn btn-cancel" onclick="closePinModal()">Annulla</button>
            <p id="pin-error" style="color: #f44336; display: none; font-weight: bold;">PIN Errato!</p>
        </div>
    </div>

    <!-- Modale Modifica Timer -->
    <div id="timer-modal">
        <div class="pin-box">
            <h2 style="margin-top: 0;">Modifica Timer <span id="timer-room-display"></span></h2>
            <p style="color: #ccc; font-size: 0.9em; margin-bottom: 15px;">Inserisci i minuti rimanenti (es. 50 per 50 minuti)</p>
            <input type="number" id="timer-input" class="modal-input" inputmode="numeric" placeholder="Minuti">
            <button class="pin-btn btn-confirm" onclick="confirmTimer()">Aggiorna Timer</button>
            <button class="pin-btn btn-cancel" onclick="closeTimerModal()">Annulla</button>
        </div>
    </div>

    <!-- Schermata Login -->
    <div id="login-overlay">
        <h1>Dashboard Sale Operatorie</h1>
        <button class="btn-login" onclick="selectRole('ALL')">📺 Monitor Generale (Sola Lettura)</button>
        <h2 style="margin-top: 30px; font-size: 1.2em;">Seleziona la tua postazione:</h2>
        <div class="room-grid" id="room-buttons"></div>
    </div>

    <!-- Dashboard Principale -->
    <div id="main-content" style="display: none;">
        <!-- Header con Titolo e Data centrati -->
        <div style="text-align: center; margin-bottom: 10px; border-bottom: 1px solid #4facfe; padding-bottom: 10px;">
            <div id="datetime-display" style="color: #aaa; font-size: 1.2em; font-weight: bold; margin-bottom: 5px;"></div>
            <h1 id="main-title" style="margin: 0; font-size: 1.6em; color: #4facfe;">Status Sale</h1>
        </div>
        
        <table id="main-table">
            <thead>
                <tr>
                    <th style="width: 20%;">Sala / Nurse</th>
                    <th style="width: 30%;">Intervento</th>
                    <th style="width: 15%;">Timer</th>
                    <th style="width: 17.5%;">Paziente in sala</th>
                    <th style="width: 17.5%;">Paziente pronto</th>
                </tr>
            </thead>
            <tbody id="table-body"></tbody>
        </table>
    </div>

    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script>
        const socket = io();
        let state = {};
        let myRole = null; 
        const rooms = ['A', 'B', 'C', 'D', 'E', 'F', '1', '2'];

        const ROOM_PINS = {
            'A': '1111', 'B': '2222', 'C': '3333', 'D': '4444',
            'E': '5555', 'F': '6666', '1': '7777', '2': '8888'
        };

        // Funzione per aggiornare Orologio e Data
        function updateClock() {
            const now = new Date();
            const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            let dateStr = now.toLocaleDateString('it-IT', optionsDate);
            // Capitalizza la prima lettera del giorno
            dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
            const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            const dtElement = document.getElementById('datetime-display');
            if (dtElement) {
                dtElement.innerText = \`\${dateStr} - \${timeStr}\`;
            }
        }
        setInterval(updateClock, 1000);
        updateClock();

        // Gestione indicatore connessione
        socket.on('connect', () => {
            document.getElementById('conn-dot').className = 'dot dot-green';
            document.getElementById('conn-text').innerText = 'Online';
        });
        socket.on('disconnect', () => {
            document.getElementById('conn-dot').className = 'dot dot-red';
            document.getElementById('conn-text').innerText = 'Offline...';
        });

        let pendingRoom = null; 
        let pendingTimerRoom = null;

        const grid = document.getElementById('room-buttons');
        rooms.forEach(room => {
            grid.innerHTML += \`<button class="btn-room" onclick="requestPin('\${room}')">Sala \${room}</button>\`;
        });

        function requestPin(room) {
            pendingRoom = room;
            document.getElementById('pin-room-display').innerText = room;
            document.getElementById('pin-error').style.display = 'none';
            document.getElementById('nurse-name-input').value = '';
            document.getElementById('pin-input').value = '';
            document.getElementById('pin-modal').style.display = 'flex';
        }

        function closePinModal() { document.getElementById('pin-modal').style.display = 'none'; pendingRoom = null; }

        function verifyPin() {
            const enteredPin = document.getElementById('pin-input').value;
            const enteredName = document.getElementById('nurse-name-input').value;
            if (enteredPin === ROOM_PINS[pendingRoom]) {
                document.getElementById('pin-modal').style.display = 'none';
                if (enteredName.trim() !== '') socket.emit('action', { room: pendingRoom, action: 'updateNurse', value: enteredName });
                selectRole(pendingRoom);
            } else {
                document.getElementById('pin-error').style.display = 'block';
                document.getElementById('pin-input').value = '';
            }
        }

        function openTimerModal(room) {
            pendingTimerRoom = room;
            document.getElementById('timer-room-display').innerText = room;
            document.getElementById('timer-input').value = '';
            document.getElementById('timer-modal').style.display = 'flex';
            document.getElementById('timer-input').focus();
        }

        function closeTimerModal() { 
            document.getElementById('timer-modal').style.display = 'none'; 
            pendingTimerRoom = null; 
        }

        function confirmTimer() {
            const mins = parseInt(document.getElementById('timer-input').value);
            if (!isNaN(mins)) {
                socket.emit('action', { room: pendingTimerRoom, action: 'setTimer', value: mins * 60 });
                closeTimerModal();
            }
        }

        function selectRole(role) {
            myRole = role;
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';
            document.getElementById('main-title').innerText = role === 'ALL' ? "Panoramica Blocco Operatorio" : "Gestione Sala " + role;
            renderTable();
        }

        socket.on('updateState', (newState) => { state = newState; renderTable(); });

        function toggleIntervention(room) { if (myRole !== 'ALL') socket.emit('action', { room, action: 'toggleIntervention' }); }
        function toggleAlert(room, type) { if (myRole !== 'ALL') socket.emit('action', { room, action: type === 'anes' ? 'toggleAnes' : 'toggleSurg' }); }

        function formatTime(seconds) {
            const isNegative = seconds < 0;
            const absSecs = Math.abs(seconds);
            const m = Math.floor(absSecs / 60).toString().padStart(2, '0');
            const s = (absSecs % 60).toString().padStart(2, '0');
            return \`\${isNegative ? '+' : ''}\${m}:\${s}\`;
        }

        function getTimerClass(seconds) {
            if (seconds > 900) return 'text-green';
            if (seconds >= 0 && seconds <= 900) return 'text-yellow';
            return 'text-red';
        }

        function renderTable() {
            if (!myRole || Object.keys(state).length === 0) return;
            const tbody = document.getElementById('table-body');
            tbody.innerHTML = '';
            
            const roomsToShow = myRole === 'ALL' ? rooms : [myRole];
            const isReadonly = myRole === 'ALL';

            roomsToShow.forEach(room => {
                const s = state[room];
                const tr = document.createElement('tr');
                const nurseNameDisplay = s.nurse ? s.nurse : '<span style="color: #888; font-size: 0.8em; font-style: italic;">Assente</span>';
                
                // Cella Sala/Nurse - Font proporzionati
                tr.innerHTML += \`<td><div style="font-size: 1.6em; font-weight: bold;">Sala \${room}</div><div style="font-size: 1em; color: #4facfe; margin-top: 2px;">\${nurseNameDisplay}</div></td>\`;
                
                // Bottone Intervento
                const intClass = s.inProgress ? 'bg-green' : 'bg-red';
                const intText = s.inProgress ? 'IN CORSO' : 'NON IN CORSO';
                if (isReadonly) {
                    tr.innerHTML += \`<td><div class="readonly-btn \${intClass}">\${intText}</div></td>\`;
                } else {
                    tr.innerHTML += \`<td><button class="action-btn \${intClass}" onclick="toggleIntervention('\${room}')">\${intText}</button></td>\`;
                }
                
                // Cella Timer
                if (s.inProgress || s.timerValue === 3600) {
                    if (isReadonly) {
                        tr.innerHTML += \`<td><div class="readonly-btn bg-dark" style="font-size: 2em;">--:--</div></td>\`;
                    } else {
                        tr.innerHTML += \`<td><button class="action-btn bg-dark" style="font-size: 2em; border: 1px solid #555;" onclick="openTimerModal('\${room}')">--:--</button></td>\`;
                    }
                } else {
                    if (isReadonly) {
                        tr.innerHTML += \`<td><span class="\${getTimerClass(s.timerValue)}">\${formatTime(s.timerValue)}</span></td>\`;
                    } else {
                        tr.innerHTML += \`<td><button class="action-btn bg-dark" style="border: 1px solid #555;" onclick="openTimerModal('\${room}')"><span class="\${getTimerClass(s.timerValue)}">\${formatTime(s.timerValue)}</span></button></td>\`;
                    }
                }
                
                // Bottone Paziente in sala (ex Anestesista)
                const anesClass = s.alertAnes ? 'bg-red' : 'bg-dark';
                const anesText = '';
                if (isReadonly) {
                    tr.innerHTML += \`<td><div class="readonly-btn \${anesClass}">\${anesText}</div></td>\`;
                } else {
                    tr.innerHTML += \`<td><button class="action-btn \${anesClass}" onclick="toggleAlert('\${room}', 'anes')">\${anesText}</button></td>\`;
                }
                
                // Bottone Paziente pronto (ex Chirurgo)
                const surgClass = s.alertSurg ? 'bg-red' : 'bg-dark';
                const surgText = '';
                if (isReadonly) {
                    tr.innerHTML += \`<td><div class="readonly-btn \${surgClass}">\${surgText}</div></td>\`;
                } else {
                    tr.innerHTML += \`<td><button class="action-btn \${surgClass}" onclick="toggleAlert('\${room}', 'surg')">\${surgText}</button></td>\`;
                }
                
                tbody.appendChild(tr);
            });
        }
    </script>
</body>
</html>
`;

// Rotta principale: mostra la dashboard
app.get('/', (req, res) => { res.send(htmlContent); });

// Salvagente: rimanda sempre alla dashboard per evitare errori 404
app.get('*', (req, res) => { res.redirect('/'); });

const rooms = ['A', 'B', 'C', 'D', 'E', 'F', '1', '2'];
let roomsState = {};
rooms.forEach(room => { roomsState[room] = { nurse: '', inProgress: false, timerValue: 3600, alertAnes: false, alertSurg: false }; });

setInterval(() => {
    let changed = false;
    rooms.forEach(room => {
        if (!roomsState[room].inProgress && roomsState[room].timerValue <= 3600 && roomsState[room].timerValue !== 3600) {
            roomsState[room].timerValue--;
            changed = true;
        }
    });
    if (changed) io.emit('updateState', roomsState);
}, 1000);

io.on('connection', (socket) => {
    socket.emit('updateState', roomsState);
    socket.on('action', (data) => {
        const { room, action, value } = data;
        if (action === 'toggleIntervention') {
            roomsState[room].inProgress = !roomsState[room].inProgress;
            roomsState[room].timerValue = roomsState[room].inProgress ? 3600 : 3599;
        } else if (action === 'toggleAnes') {
            roomsState[room].alertAnes = !roomsState[room].alertAnes;
        } else if (action === 'toggleSurg') {
            roomsState[room].alertSurg = !roomsState[room].alertSurg;
        } else if (action === 'updateNurse') {
            roomsState[room].nurse = value;
        } else if (action === 'setTimer') {
            roomsState[room].timerValue = value;
            roomsState[room].inProgress = false;
        }
        io.emit('updateState', roomsState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('Server operativo nel Cloud sulla porta ' + PORT);
});
