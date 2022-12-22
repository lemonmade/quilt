import {createRequestRouter, html} from '@quilted/quilt/request-router';

const router = createRequestRouter();

router.get('/', () => html('Hello world!'));

export default router;
