import Koa from 'koa';
import Router from 'koa-router';
import winston from 'winston';
import { WebRtcConnectionManager } from './lib/webrtc-connection-manager.js';
import { setupIntercom } from './lib/setup-intercom.js';

const NODE_ENV = process.env?.NODE_ENV || 'development';

const { combine, timestamp, cli, json, simple } = winston.format;

const app = new Koa();
const router = new Router();
const logger = winston.createLogger({
  level: process.env?.LOG_LEVEL || 'info',
  format: NODE_ENV === 'development' ? combine(timestamp(), cli(), simple()) : combine(timestamp(), json()),
  transports: [new winston.transports.Console()],
});

const connectionManager = new WebRtcConnectionManager();

function cleanup() {
  for (const connection of connectionManager.connections.values()) {
    connection.close();
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

const getConnection = async (ctx, next) => {
  const { id } = ctx.params;
  ctx.state = ctx.state || {};
  const connection = connectionManager.getConnection(id);

  if (connection) {
    ctx.state.connection = connection;
  } else {
    ctx.status = 404;
  }

  next();
};

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

router.post(
  '/connections',
  async (ctx, next) => {
    try {
      const connection = await connectionManager.createConnection({
        beforeOffer: setupIntercom,
      });
      ctx.state.connections = connectionManager.getConnections();
      ctx.body = JSON.stringify(connection.toJSON());
    } catch (error) {
      logger.error(error);
      ctx.status = 500;
    } finally {
      next();
    }
  },
  (ctx) => logger.info('POST /connections', { connections: ctx.state.connections?.keys() }),
);

router.get(
  '/connections/:id',
  getConnection,
  async (ctx, next) => {
    next();

    const { connection } = ctx.state;

    if (connection) {
      ctx.body = JSON.stringify(ctx.state.connection.toJSON());
    }
  },
  (ctx) => logger.info(`GET /connections/${ctx.params.id}`, { status: ctx.status }),
);

router.delete(
  '/connections/:id',
  getConnection,
  async (ctx, next) => {
    next();

    const { connection } = ctx.state;

    if (connection) {
      connection.close();
      logger.info(`Close connection ${ctx.params.id}`);
      ctx.body = JSON.stringify(connection.toJSON());
    }
  },
  (ctx) => logger.info(`DELETE /connections/${ctx.params.id}`, { status: ctx.status }),
);

router.get(
  '/connections/:id/local-description',
  getConnection,
  async (ctx, next) => {
    next();

    const { connection } = ctx.state;

    if (connection) {
      ctx.body = JSON.stringify(connection.toJSON().localDescription);
    }
  },
  (ctx) => logger.info(`GET /connections/${ctx.params.id}/local-description`, { status: ctx.status }),
);

router.get(
  '/connections/:id/remote-description',
  getConnection,
  async (ctx, next) => {
    next();

    const { connection } = ctx.state;

    if (connection) {
      ctx.body = JSON.stringify(connection.toJSON().remoteDescription);
    }
  },
  (ctx) => logger.info(`GET /connections/${ctx.params.id}/remote-description`, { status: ctx.status }),
);

app.use(router.routes()).use(router.allowedMethods());

logger.info(`Listening on localhost:${process.env.PORT}`);
app.listen(process.env.PORT);
