import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RangeHeader = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ headers: { range?: string } }>();
    return request.headers.range;
  },
);
