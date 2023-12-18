import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return `
             Hello World! from worker with proccess.pid:  
            ${process.pid}
     `;
  }
}
