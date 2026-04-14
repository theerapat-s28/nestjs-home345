import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { handlePrismaError } from "@common/helpers/prisma-error";

/**
 * Global Error Interceptor
 *
 * Intercepts and standardizes *all* errors thrown inside the application —
 * including Prisma, HttpExceptions, and unhandled runtime errors.
 *
 * If the error is from Prisma → delegates to handlePrismaError()
 * Otherwise → returns a consistent JSON structure for the client.
 */
@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();

    return next.handle().pipe(
      catchError((error) => {
        // Handle Prisma errors first
        if (error?.code?.startsWith("P")) {
          try {
            handlePrismaError(error);
          } catch (handled) {
            return throwError(() => handled);
          }
        }

        // Handle known HttpException (NestJS)
        if (error instanceof HttpException) {
          const statusCode = error.getStatus();
          const response: any = error.getResponse();

          const formattedError = {
            httpCode: statusCode,
            message:
              typeof response === "string"
                ? response
                : (response?.message ?? "Unexpected error"),
            error: response?.error ?? null,
            timestamp: new Date().toISOString(),
            path: request.url,
          };

          return throwError(
            () => new HttpException(formattedError, statusCode),
          );
        }

        // Handle unexpected JS/Runtime errors
        console.error("[Unhandled Error]", error);

        const formattedError = {
          httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? "Internal server error",
          error: error.stack ?? null,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        return throwError(
          () =>
            new HttpException(formattedError, HttpStatus.INTERNAL_SERVER_ERROR),
        );
      }),
    );
  }
}
