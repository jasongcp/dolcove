import { buildApp } from './app';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';

const start = async (): Promise<void> => {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const host = process.env.HOST ?? DEFAULT_HOST;

  try {
    await app.listen({ host, port });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
