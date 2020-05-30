import React from 'react';
import {mount} from '@quilted/react-testing';

import {RouterContext} from '../../context';
import {Redirect} from './Redirect';

describe('<Redirect />', () => {
  it('works', () => {
    const spy = jest.fn();
    mount(
      <RouterContext.Provider value={{navigate: spy} as any}>
        <Redirect to="/foo/bar" />
      </RouterContext.Provider>,
    );
    console.log(spy.mock.calls);
  });
});
