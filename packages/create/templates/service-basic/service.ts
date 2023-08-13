import {createRequestRouter} from '@quilted/request-router';

const app = createRequestRouter();

app.get('/', () => new Response('Hello, world!'));

export default app;
