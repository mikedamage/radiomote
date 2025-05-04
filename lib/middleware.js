export const jsonResponse = async (ctx, next) => {
  ctx.response.headers['Content-Type'] = 'application/json';
  next();
};

export const getConnection = (connectionManager) => async (id, ctx, next) => {
  ctx.state = ctx.state || {};
  const connection = connectionManager.getConnection(id);

  if (connection) {
    ctx.state.connection = connection;
  } else {
    ctx.status = 404;
  }

  next();
};

export const logRequest = (logger) => async (ctx, next) => {
  logger.info(`${ctx.status} ${ctx.method} ${ctx.path}`);
  await next();
};
