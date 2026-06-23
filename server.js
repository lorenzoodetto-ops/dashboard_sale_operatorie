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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Status Sale Operatorie</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #1e1e1e; color: white; margin: 0; padding: 20px; }
        h1 { text-align: center; color: #4facfe; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; background-color: #2b2b2b; }
        th, td { padding: 15px; text-align: center; border: 1px solid #444; }
        th { background-color: #333; font-size: 1.1em; }
        .clickable { cursor: pointer; transition: 0.2s; font-weight: bold; }
        .clickable:hover { filter: brightness(1.2); }
        .bg-red { background-color: #d32f2f; color: white; }
        .bg-green { background-color: #388e3c; color: white; }
        .bg-dark { background-color: #444; color: #888; }
        .text-green { color: #4caf50; font-weight: bold; font-size: 1.2em;}
        .text-yellow { color: #ffeb3b; font-weight: bold; font-size: 1.2em;}
        .text-red { color: #f44336; font-weight: bold; font-size: 1.2em;}
        
        #login-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #1e1e1e; z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .btn-login { background: #4facfe; color: white; border: none; padding: 15px 30px; margin: 10px; font-size: 1.2em; border-radius: 5px; cursor: pointer; font-weight: bold; }
        .room-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 20px; }
        .btn-room { background: #333; border: 2px solid #4facfe; color: white; padding: 20px; font-size: 1.5em; border-radius: 8px; cursor: pointer; }
        .readonly { cursor: not-allowed; opacity: 0.9; }

        #pin-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; align-items: center; justify-content: center; flex-direction: column; }
        .pin-box { background: #2b2b2b; padding: 30px; border-radius: 10px; text-align: center; border: 2px solid #4facfe; width: 300px;}
        .modal-input { font-size: 1.2em; padding: 10px; width: 80%; text-align: center; margin-bottom: 15px; border-radius: 5px; border: none; }
        #pin-input { letter-spacing: 5px; font-weight: bold; }
        .pin-btn { font-size: 1.1em; padding: 10px 15px; margin: 5px; cursor: pointer; border-radius: 5px; border: none; font-weight: bold; }
        .btn-confirm { background: #388e3c; color: white; }
        .btn-cancel { background: #d32f2f; color: white; }
    </style>
</head>
<body>
    <div id="pin-modal">
        <div class="pin-box">
            <h2>Sblocca Sala <span id="pin-room-display"></span></h2>
            <input type="text" id="nurse-name-input" class="modal-input" placeholder="Tuo Nome (Nurse)" autocomplete="off">
            <br>
            <input type="password" id="pin-input" class="modal-input" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="PIN">
            <br>
            <button class="pin-btn btn-confirm" onclick="verifyPin()">Entra</button>
            <button class="pin-btn btn-cancel" onclick="closePinModal()">Annulla</button>
            <p id="pin-error" style="color: #f44336; display: none; font-weight: bold; margin-top: 15px;">PIN Errato!</p>
        </div>
    </div>

    <div id="login-overlay">
        <h1 style="font-size: 2.5em; margin-bottom: 40px;">Dashboard Sale Operatorie</h1>
        <button class="btn-login" onclick="selectRole('ALL')">📺 Apri come Monitor Generale (Sola Lettura)</button>
        <h2 style="margin-top: 40px;">Seleziona la tua postazione:</h2>
        <div class="room-grid" id="room-buttons"></div>
    </div>

    <div id="main-content" style="display: none;">
        <h1 id="main-title">Status Sale Operatorie</h1>
        <table id="main-table">
            <thead>
                <tr><th>Nome Sala (Nurse)</th><th>Intervento</th><th>Change Over</th><th>Alert Anestesista</th><th>Alert Chirurgo</th></tr>
            </thead>
            <tbody id="table-body"></tbody>
        </table>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let state = {};
        let myRole = null; 
        const rooms = ['A', 'B', 'C', 'D', 'E', 'F', '1', '2'];

        const ROOM_PINS = {
            'A': '1111', 'B': '2222', 'C': '3333', 'D': '4444',
            'E': '5555', 'F': '6666', '1': '7777', '2': '8888'
        };

        let pendingRoom = null; 

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
            document.getElementById('nurse-name-input').focus();
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
                document.getElementById('pin-input').focus();
            }
        }

        document.getElementById('pin-input').addEventListener('keypress', function(e) { if (e.key === 'Enter') verifyPin(); });

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
                const nurseNameDisplay = s.nurse ? s.nurse : '<span style="color: #888; font-style: italic;">Non assegnato</span>';
                
                tr.innerHTML += \`<td><strong>Sala \${room}</strong><br><br><div style="font-size: 1.2em; color: #4facfe; font-weight: bold;">\${nurseNameDisplay}</div></td>\`;
                
                const intClass = s.inProgress ? 'bg-green' : 'bg-red';
                const clickClass = isReadonly ? 'readonly' : 'clickable';
                
                tr.innerHTML += \`<td class="\${clickClass} \${intClass}" \${isReadonly ? '' : \`onclick="toggleIntervention('\${room}')"\`}>\${s.inProgress ? 'IN CORSO' : 'NON IN CORSO'}</td>\`;
                
                if (s.inProgress || s.timerValue === 3600) {
                    tr.innerHTML += \`<td class="bg-dark">--:--</td>\`;
                } else {
                    tr.innerHTML += \`<td><span class="\${getTimerClass(s.timerValue)}">\${formatTime(s.timerValue)}</span></td>\`;
                }
                
                const anesClass = s.alertAnes ? 'bg-red' : 'bg-dark';
                tr.innerHTML += \`<td class="\${clickClass} \${anesClass}" \${isReadonly ? '' : \`onclick="toggleAlert('\${room}', 'anes')"\`}>\${s.alertAnes ? 'CHIAMATO' : 'Spento'}</td>\`;
                
                const surgClass = s.alertSurg ? 'bg-red' : 'bg-dark';
                tr.innerHTML += \`<td class="\${clickClass} \${surgClass}" \${isReadonly ? '' : \`onclick="toggleAlert('\${room}', 'surg')"\`}>\${s.alertSurg ? 'CHIAMATO' : 'Spento'}</td>\`;
                
                tbody.appendChild(tr);
            });
        }
    </script>
</body>
</html>
`;

app.get('/', (req, res) => { res.send(htmlContent); });

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
        }
        io.emit('updateState', roomsState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('Server operativo nel Cloud sulla porta ' + PORT);
});