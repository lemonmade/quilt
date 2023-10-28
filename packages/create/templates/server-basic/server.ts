import {RequestRouter} from '@quilted/quilt/request-router';

const app = new RequestRouter();

app.get('/', () => new Response('Hello, world!'));

export default app;
