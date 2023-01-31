import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 4040 });

let connections: WebSocket[] = [];
let messages: string[] = [];

wss.on('connection', (ws) => {
  console.log('- connectioned ', connections.length);
  connections.push(ws);
  if (messages.length > 0) {
    console.log('-  send backlog X ', messages.length)
    messages.forEach(message => ws.send(message));
  }

  ws.on('close', () => {
    const ix = connections.findIndex(conn => (conn === ws));
    console.log('- disconnectioned ', ix);
    if (ix >= 0) connections.splice(ix, 1);
  });

  ws.on('message', (data) =>  {
    const message = data.toString();
    messages.push(message);

    console.log('- send message:', message, ' X ', connections.length);
    connections.forEach(con => con.send(message));
  });

  ws.on('error', (err) => {
    console.error("= Error: ", err);
  });

});