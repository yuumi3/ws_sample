import { WebSocketServer, WebSocket } from 'ws';
import { jsonToMaintenanceNotice } from 'maintenance-notice';

const wss = new WebSocketServer({ port: 4040 });

let connections: WebSocket[] = [];
let messageHistory: string[] = [];

wss.on('connection', (ws) => {
  console.log('- connectioned ', connections.length);
  connections.push(ws);
  if (messageHistory.length > 0) {
    console.log('-  send history X ', messageHistory.length)
    messageHistory.forEach(message => ws.send(message));
  }

  ws.on('close', () => {
    const ix = connections.findIndex(conn => (conn === ws));
    console.log('- disconnectioned ', ix);
    if (ix >= 0) connections.splice(ix, 1);
  });

  ws.on('message', (data) =>  {
    const message = data.toString();
    const notice = jsonToMaintenanceNotice(message);

    if (notice.command && notice.command == "CLAER") {
      console.log('- clear history');
      messageHistory = [];
    } else {
      messageHistory.push(message);
    }

    console.log('- send message:', message, ' X ', connections.length);
    connections.forEach(con => con.send(message));
  });

  ws.on('error', (err) => {
    console.error("= Error: ", err);
  });

});