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
  const getWorkerIndex = (ip: string) => {
    return farmhash.fingerprint32(ip) % numCPUs;
  };

  if (clusterModule.isPrimary) {
    console.log(`
             Master server started,proccess.pid:${process.pid},
             number of cpus: ${numCPUs}
     `);
    for (let i = 0; i < numCPUs; i++) {
      workers[i] = clusterModule.fork();
      workers[i].on('exit', (worker, code, signal) => {
        console.log(`
                      Worker with code: ${code} and    
                      signal: ${signal} is   Restarting...
             `);
        workers[i] = clusterModule.fork();
      });
    }
    net
      .createServer({ pauseOnConnect: true }, (connection) => {
        const workerIndex = getWorkerIndex(connection.remoteAddress);
        workers[workerIndex].send('sticky-session:connection', connection);
      })
      .listen(3000);
  } else {
    const app = await NestFactory.create(AppModule);
    console.log(`
       Worker server started, process.pid: ${process.pid}
    `);
    const server = await app.listen(0);
    process.on('message', (message, connection: any) => {
      if (message !== 'sticky-session:connection') {
        return;
      }
      server.emit('connection', connection);
      connection.resume();
    });
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  }
}
bootstrap();
