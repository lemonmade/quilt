import {describe, it, expect} from 'vitest';

import {renderApp} from '~/tests/render.ts';

import Home from '../Home.tsx';

describe('<Home />', () => {
  it('includes a welcome message', async () => {
    const home = await renderApp(<Home />);
    expect(home).toContainPreactText('Hello world!');
  });
});
