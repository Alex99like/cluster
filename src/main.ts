import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cluster from 'cluster';
import { cpus } from 'os';
import * as farmhash from 'farmhash';
import * as net from 'net';
import { RedisIoAdapter } from './redis-io-adapter';

export const clusterModule = cluster as unknown as cluster.Cluster;
const numCPUs = cpus().length;
const workers = {};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();

  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(3000);
}
bootstrap();
