import {Hono} from 'hono';

const app = new Hono();

app.get('/', () => new Response('Hello, world!'));

export default app;
