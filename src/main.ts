import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as https from 'https';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend communication
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
  });

  // No Global Prefix to match exact swagger specs

  // Request logger for debugging
  app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.url}`);
    next();
  });

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('QR Menu Mobile API')
    .setDescription('API for Client and Merchant mobile apps')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
  
  // Keep Render awake
  const url = 'https://backend-qr-h4th.onrender.com/health';
  setInterval(() => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        console.log('Self-ping success: Stay awake mode active 🚀');
      }
    }).on('error', (err) => {
      console.error('Self-ping error:', err.message);
    });
  }, 10 * 60 * 1000); // 10 minutes

  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation available at: ${await app.getUrl()}/api-docs`);
}
bootstrap();
