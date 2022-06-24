const GlobalRequest = (typeof Request === 'undefined'
  ? class Request {
      constructor() {
        throw new Error('No Request global was found');
      }
    }
  : Request) as any as typeof Request;

const GlobalResponse = (typeof Response === 'undefined'
  ? class Response {
      constructor() {
        throw new Error('No Response global was found');
      }
    }
  : Response) as any as typeof Response;

export {GlobalRequest as Request, GlobalResponse as Response};

type GlobalBodyInit = BodyInit;
type GlobalResponseInit = ResponseInit;
type GlobalRequestInit = RequestInit;

export type {
  GlobalBodyInit as BodyInit,
  GlobalResponseInit as ResponseInit,
  GlobalRequestInit as RequestInit,
};
