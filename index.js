import WebSocket from 'ws';
import { API_KEY, API_SECRET } from './credentials.js';
import { createHmac } from 'crypto';
import winston from 'winston';
import { SERVER_ADDRESS } from './properties.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint()
  ),
  transports: [
    new winston.transports.File({ filename: './pong.log', level: 'info' }),
  ],
});

const date = new Date().toUTCString();

const authHeader = (apiKey, apiSecret, date) => {
  const signature = createHmac('sha1', apiSecret)
    .update(`date: ${date}`)
    .digest('base64');
  return `hmac username="${apiKey}", algorithm="hmac-sha1", headers="date", signature="${signature}"`
};

const connect = () => {
  var ws = new WebSocket(`ws://${SERVER_ADDRESS}`, {
    headers: {
      date: date,
      apiKey: API_KEY,
      authorization: authHeader(API_KEY, API_SECRET, date)
    }
  });
  let pingInterval;
  ws.on('open', function open() {
    console.log('Opened socket');
    logger.log('info', 'Connected');
    pingInterval = setInterval(() => {
      ws.send('{ "type": "ping" }');
      logger.log('info','Ping sent');
    }, 1000);
  });

  ws.on('message', function incoming(data) {
    logger.log('info','Pong received');
    console.log('Pong received');
  });

  ws.onclose = function(e) {
    console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
    logger.log('info', 'Connection closed, trying to reconnect');
    clearInterval(pingInterval);
    setTimeout(function() {
      connect();
    }, 5000);
  };

  ws.onerror = function(err) {
    console.error('Socket encountered error: ', err.message, 'Closing socket');
    ws.close();
  };
};

connect();