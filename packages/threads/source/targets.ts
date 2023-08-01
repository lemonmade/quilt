export {createThread, type ThreadOptions} from './targets/target.ts';
export {createThreadFromIframe} from './targets/iframe/iframe.ts';
export {createThreadFromInsideIframe} from './targets/iframe/nested.ts';
export {createThreadFromMessagePort} from './targets/message-port.ts';
export {createThreadFromBrowserWebSocket} from './targets/web-socket-browser.ts';
export {createThreadFromWebWorker} from './targets/web-worker.ts';
