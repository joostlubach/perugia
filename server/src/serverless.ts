import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';

// Reused across warm invocations of the same Vercel function instance. The
// Express app itself is the handler: Vercel's Node runtime calls it with (req, res).
let cachedHandler: express.Express | null = null;

export async function getHandler() {
  if (!cachedHandler) {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    app.enableCors();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
    cachedHandler = expressApp;
  }
  return cachedHandler;
}
