import React from 'react';
import {createMount} from '@quilted/react-testing';

import {RouterContext} from '../../context';
import {Redirect} from './Redirect';

describe('<Redirect />', () => {
  it('works', () => {
    const spy = jest.fn();
    const to = '/my/path';

    mountWithNavigateSpy(<Redirect to={to} />, {navigate: spy});

    expect(spy).toHaveBeenCalledWith(to, {replace: true});
  });
});

const mountWithNavigateSpy = createMount<{navigate: jest.Mock}>({
  // The auto-fix for this causes syntax errors...
  // eslint-disable-next-line react/function-component-definition
  render(element, _, {navigate}) {
    return (
      <RouterContext.Provider value={{navigate} as any}>
        {element}
      </RouterContext.Provider>
    );
  },
});
