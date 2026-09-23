import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverlessHttp from 'serverless-http';
import { AppModule } from './app.module';

// Reused across warm invocations of the same Vercel lambda instance.
let cachedHandler: ReturnType<typeof serverlessHttp> | null = null;

export async function getHandler() {
  if (!cachedHandler) {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    app.enableCors();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
    cachedHandler = serverlessHttp(expressApp);
  }
  return cachedHandler;
}
