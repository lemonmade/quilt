import {RequestRouter, HTMLResponse} from '@quilted/quilt/request-router';

const router = new RequestRouter();

router.get('/', () => new HTMLResponse('Hello world!'));

export default router;
