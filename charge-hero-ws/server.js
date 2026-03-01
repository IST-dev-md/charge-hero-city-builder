const WebSocket = require('ws');
const http = require('http');

const WS_PORT = process.env.WS_PORT || 8080;
const BRIDGE_PORT = process.env.BRIDGE_PORT || 8081;

const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`WebSocket running on ws://localhost:${WS_PORT}`);

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Bridge HTTP → WS
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const message = JSON.parse(body);

        // Broadcast to all connected clients
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });

        res.writeHead(200);
        res.end('OK');
      } catch (err) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });

  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(BRIDGE_PORT, () => {
  console.log(`Bridge running on http://localhost:${BRIDGE_PORT}/broadcast`);
});