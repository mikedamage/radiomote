import Koa from 'koa';
import Router from 'koa-router';
import winston from 'winston';
import { WebRtcConnectionManager } from './lib/webrtc-connection-manager.js';
import { setupIntercom } from './lib/setup-intercom.js';

const NODE_ENV = process.env?.NODE_ENV || 'development';

const app = new Koa();
const router = new Router();
const logger = winston.createLogger({
  level: process.env?.LOG_LEVEL || 'info',
  format: NODE_ENV === 'development' ? winston.format.simple() : winston.format.json(),
  transports: [new winston.transports.Console()],
});

const connectionManager = WebRtcConnectionManager.create({
  beforeOffer(peerConnection) {
    setupIntercom(peerConnection);
  },
});

function cleanup() {
  for (const connection of connectionManager.connections.values()) {
    connection.close();
  }
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

router.get(
  '/connections',
  async (ctx, next) => {
    ctx.state = ctx.state || {};
    ctx.state.connections = connectionManager.getConnections();
    ctx.body = JSON.stringify(ctx.state.connections);
    next();
  },
  (ctx) => {
    logger.info('GET /connections', { connections: ctx.state.connections.keys() });
  },
);

app.use(router.routes()).use(router.allowedMethods());

logger.info(`Listening on localhost:${process.env.PORT}`);
app.listen(process.env.PORT);
