import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import {
  Logger,
  ValidationPipe,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import * as cookieParser from "cookie-parser";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ErrorInterceptor } from "@core/interceptor/error.interceptor";
import { ResponseInterceptor } from "@core/interceptor/response.interceptor";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const configService = new ConfigService();
  
  // Try to get port from BACKEND_URL first, then fallback to PORT environment variable
  const backendUrl = configService.get<string>("BACKEND_URL") || "http://localhost:3000";
  let apiPort: number;
  try {
    const parsedUrl = new URL(backendUrl);
    apiPort = parsedUrl.port ? parseInt(parsedUrl.port, 10) : (configService.get<number>("PORT") || 3000);
  } catch {
    apiPort = configService.get<number>("PORT") || 3000;
  }

  // ---------------- CONFIG APPLICATION ----------------
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new ResponseInterceptor(),
    new ErrorInterceptor(),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin:
      configService.get<string>("FRONTEND_URL") || "http://localhost:4200",
    credentials: true,
  });
  // ---------------- SWAGGER DOCUMENT ----------------
  const isDev = process.env.NODE_ENV === "development";
  const isBypassEnabled = process.env.BYPASS_AUTH === "true";

  const appName = process.env.APP_NAME || "Personal API";

  const swaggerDescription = [
    `${appName} — User-facing API (JWT Protected)`,
    isDev && isBypassEnabled
      ? "<br><b>Development Mode:</b> Local authentication bypass is enabled."
      : '<br><a href="/api/auth/google?state=swagger" style="padding: 8px 16px; background-color: #4285F4; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Login with Google</a>',
  ]
    .filter(Boolean)
    .join("<br>");

  const swaggerApiConfig = new DocumentBuilder()
    .setTitle(`${appName} API`)
    .setDescription(swaggerDescription)
    .setVersion(process.env.APP_VERSION || "1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        in: "header",
        name: "Authorization",
        description: "JWT access token",
      },
      "access-token",
    )
    .build();

  const apiDocument = SwaggerModule.createDocument(app, swaggerApiConfig);
  SwaggerModule.setup("api/docs", app, apiDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
    customSiteTitle: `${appName} API Docs`,
  });

  // ---------------- START APPLICATION ----------------
  await Promise.all([app.listen(apiPort)]);

  logger.log(`Application:                 ${appName}`);
  logger.log(`🚀 API (JWT) running at:     http://localhost:${apiPort}/api`);
  logger.log(`🔌 WebSocket path:           http://localhost:${apiPort}/socket`);
  logger.log(
    `📘 Swagger docs:             http://localhost:${apiPort}/api/docs`,
  );
  logger.log(
    `Swagger docs in json:        http://localhost:${apiPort}/api/docs-json`,
  );
  logger.log(
    `🌍 Environment:              ${process.env.NODE_ENV || "development"}`,
  );
}

bootstrap();
