import Koa from 'koa';
import Router from 'koa-router';
import { logger } from './lib/logger.js';
import { jsonResponse, getConnection, logRequest } from './lib/middleware.js';
import { send } from '@koa/send';
import { join as pathJoin } from 'node:path';
import { WebRtcConnectionManager } from './lib/webrtc-connection-manager.js';
import { setupIntercom } from './lib/setup-intercom.js';

const connectionManager = new WebRtcConnectionManager();

function cleanup() {
  for (const connection of connectionManager.connections.values()) {
    connection.close();
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

const app = new Koa();
const router = new Router();

router.param('id', getConnection(connectionManager));
router.use(logRequest(logger));

router.get('/', async (ctx) => {
  ctx.status = 200;
  await send(ctx, pathJoin('public', 'index.html'));
});

router.get('/connections', jsonResponse, async (ctx, next) => {
  ctx.state = ctx.state || {};
  ctx.state.connections = connectionManager.getConnections();
  ctx.body = JSON.stringify(ctx.state.connections);
  next();
});

router.post('/connections', jsonResponse, async (ctx, next) => {
  try {
    const connection = await connectionManager.createConnection({
      beforeOffer: setupIntercom,
    });
    ctx.state.connections = connectionManager.getConnections();
    ctx.status = 201;
    ctx.body = JSON.stringify(connection.toJSON());
  } catch (error) {
    logger.error(error);
    ctx.status = 500;
    throw error;
  } finally {
    await next();
  }
});

router.get('/connections/:id', async (ctx, next) => {
  next();

  const { connection } = ctx.state;

  if (connection) {
    ctx.body = JSON.stringify(ctx.state.connection.toJSON());
  }
});

router.delete('/connections/:id', jsonResponse, async (ctx, next) => {
  next();

  const { connection } = ctx.state;

  if (connection) {
    connection.close();
    logger.info(`Close connection ${ctx.params.id}`);
    ctx.body = JSON.stringify(connection.toJSON());
  }
});

router.get('/connections/:id/local-description', jsonResponse, async (ctx, next) => {
  await next();

  const { connection } = ctx.state;

  if (connection) {
    ctx.body = JSON.stringify(connection.toJSON().localDescription);
  }
});

router.get('/connections/:id/remote-description', jsonResponse, async (ctx, next) => {
  await next();

  const { connection } = ctx.state;

  if (connection) {
    ctx.body = JSON.stringify(connection.toJSON().remoteDescription);
  }
});

router.patch('/connections/:id/remote-description', jsonResponse, async (ctx, next) => {
  next();

  const { connection } = ctx.state;

  try {
    await connection.applyAnswer(JSON.parse(ctx.request.body));

    ctx.status = 200;
    ctx.body = connection.toJSON().remoteDescription;
  } catch (error) {
    ctx.status = 400;
  }
});

app.use(router.routes()).use(router.allowedMethods());

app.use(async (ctx, next) => {
  if (/^\/(js|css|images)/.test(ctx.path)) {
    logger.info(ctx.path);
    await send(ctx, ctx.path, { root: pathJoin(import.meta.dirname, 'public') });
    return;
  }
  await next();
});

logger.info(`Listening on localhost:${process.env.PORT}`);
app.listen(process.env.PORT);
