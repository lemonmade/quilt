import {createHttpHandler, html} from '@quilted/quilt/http-handlers';

const handler = createHttpHandler();

handler.get('/', () => html('Hello world!'));

export default handler;
