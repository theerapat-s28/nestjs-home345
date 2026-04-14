import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

/**
 * Utility: Convert Prisma Errors → NestJS HttpException
 *
 * This helper translates PrismaClientKnownRequestError codes into
 * human-readable NestJS HTTP exceptions.
 *
 * Use this inside your service layer so that Prisma errors become
 * understandable for the client and are automatically formatted
 * by your ResponseInterceptor.
 */
export function handlePrismaError(error: any): never {
  // Prisma known errors always include a `code` property.
  if (!error.code) {
    console.error("[Unknown Error]", error);
    throw new InternalServerErrorException(
      "An unexpected database error occurred.",
    );
  }

  switch (error.code) {
    case "P2000":
      // The provided value for the column is too long
      throw new BadRequestException(
        "The provided value is too long for this field.",
      );

    case "P2001":
      // The record searched for in the where condition does not exist
      throw new NotFoundException(
        "No record found matching the provided condition.",
      );

    case "P2002":
      // Unique constraint failed
      throw new ConflictException(
        "Duplicate value detected. This record already exists.",
      );

    case "P2003":
      // Foreign key constraint failed (insert referencing non-existent parent, or delete/update blocked by child)
      throw new BadRequestException(
        "Foreign key constraint failed. A referenced record does not exist or is still referenced by another record.",
      );

    case "P2004":
      // A constraint failed on the database
      throw new ForbiddenException(
        "The database constraint prevents this action.",
      );

    case "P2025":
      // Record not found for update/delete
      throw new NotFoundException(
        "The record you are trying to modify does not exist.",
      );

    default:
      // Unknown Prisma error code
      console.error("[Unhandled Prisma Error]", error);
      throw new InternalServerErrorException(
        "An unhandled database error occurred (Prisma).",
      );
  }
}
