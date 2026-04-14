import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  /**
   * By default, passport-google-oauth20 strips away any custom query
   * parameters attached to the original login URL (like ?state=swagger).
   * We override this method to explicitly instruct the strategy to pass
   * the 'state' parameter onto Google, which will dutifully return it
   * back to our callback URL after successful authentication.
   */
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    return {
      state: req.query.state,
    };
  }
}
