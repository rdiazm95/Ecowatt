import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS para poder llamar desde la app móvil u otras herramientas
  app.enableCors();

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // elimina propiedades no definidas en el DTO
      forbidNonWhitelisted: true, // lanza error si llegan propiedades extra
      transform: true,            // transforma tipos (string -> number, Date, etc.)
    }),
  );

  // Configuración de Swagger (documentación de la API)
  const config = new DocumentBuilder()
    .setTitle('EcoWatt API')
    .setDescription('API para precios PVPC y simulación de consumo eléctrico')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`EcoWatt API escuchando en http://localhost:${port}`);
  console.log(`Documentación Swagger en http://localhost:${port}/api-docs`);
}
bootstrap();
