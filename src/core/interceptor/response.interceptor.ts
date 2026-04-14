import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    return next.handle().pipe(
      map((data: any) => {
        const statusCode = response.statusCode ?? HttpStatus.OK;

        const isPaginated =
          data &&
          typeof data === "object" &&
          "data" in data &&
          "meta" in data &&
          data.meta?.totalRecords !== undefined;

        // Recursively find and convert Decimal objects to Numbers
        const transformData = (obj: any): any => {
          if (obj === null || obj === undefined) return obj;

          // Preserve Date objects (fixes Angular frontend the NG02100 error)
          if (
            obj instanceof Date ||
            Object.prototype.toString.call(obj) === "[object Date]"
          ) {
            return obj;
          }

          if (Array.isArray(obj)) {
            return obj.map(transformData);
          }

          if (typeof obj === "object") {
            // Check if it's a Prisma Decimal
            if (
              obj.constructor?.name === "Decimal" ||
              (obj.d && obj.s && obj.e !== undefined)
            ) {
              return Number(obj);
            }

            // Only recurse if it's a plain object
            if (obj.constructor === Object || !obj.constructor) {
              const newObj: any = {};
              for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                  newObj[key] = transformData(obj[key]);
                }
              }
              return newObj;
            }
          }

          return obj;
        };

        const rawData = isPaginated ? data.data : (data?.data ?? data);
        const processedData = transformData(rawData);

        return {
          httpCode: statusCode,
          message: data?.message ?? "Success",
          data: processedData,
          pagination: isPaginated ? data.meta : undefined,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
