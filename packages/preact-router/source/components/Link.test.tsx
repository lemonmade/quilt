// @vitest-environment jsdom

import {describe, it, expect, vi} from 'vitest';

import {render, TestNavigation} from '../tests/utilities.tsx';

import {Link} from './Link.tsx';

describe('<Link />', () => {
  it('creates an anchor tag', () => {
    using link = render(<Link to="/" />);
    expect(link).toContainPreactComponent('a', {href: '/'});
  });

  it('creates an anchor from a relative `to`', () => {
    using link = render(<Link to="my-product" />, {
      navigation: new TestNavigation('https://example.com/products'),
    });

    expect(link).toContainPreactComponent('a', {href: '/products/my-product'});
  });

  it('creates an anchor from an absolute `to` in a custom base URL', () => {
    using link = render(<Link to="/products" />, {
      navigation: new TestNavigation('https://example.com/admin/orders', {
        base: '/admin',
      }),
    });

    expect(link).toContainPreactComponent('a', {href: '/admin/products'});
  });

  it('creates an anchor from an absolute `to` with a custom base URL on the link', () => {
    using link = render(<Link to="/products" base="/" />, {
      navigation: new TestNavigation('https://example.com/admin/orders', {
        base: '/admin',
      }),
    });

    expect(link).toContainPreactComponent('a', {href: '/products'});
  });

  it('passes additional props through to the anchor tag', () => {
    const label = 'Home';
    using link = render(<Link to="/" aria-label={label} />);
    expect(link).toContainPreactComponent('a', {'aria-label': label});
  });

  describe('onClick()', () => {
    it('calls the onClick() prop with the DOM event', () => {
      const onClick = vi.fn();
      const event = createClickEvent();

      using link = render(<Link to="/" onClick={onClick} />);
      link.find('a')!.trigger('onClick', event);

      expect(onClick).toHaveBeenCalledWith(event);
    });

    it('calls navigation.navigate() with the `to` prop for normal clicks', () => {
      const to = '/';
      const navigation = new TestNavigation('https://example.com');
      const navigate = vi.spyOn(navigation, 'navigate');

      using link = render(<Link to={to} />, {navigation});
      link.find('a')!.trigger('onClick', createClickEvent());

      expect(navigate).toHaveBeenCalledWith(to);
    });

    it('does not call navigation.navigate() when the link is explicitly marked as `external`', () => {
      const navigation = new TestNavigation('https://example.com');
      const navigate = vi.spyOn(navigation, 'navigate');

      using link = render(<Link to="/" external />, {navigation});
      link.find('a')!.trigger('onClick', createClickEvent());

      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not call navigation.navigate() when `onClick()` calls `event.preventDefault()`', () => {
      const navigation = new TestNavigation('https://example.com');
      const navigate = vi.spyOn(navigation, 'navigate');

      using link = render(
        <Link to="/" onClick={(event) => event.preventDefault()} />,
        {navigation},
      );
      link.find('a')!.trigger('onClick', createClickEvent());

      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not call navigation.navigate() when the shift key is pressed', () => {
      const navigation = new TestNavigation('https://example.com');
      const navigate = vi.spyOn(navigation, 'navigate');

      using link = render(<Link to="/" />, {navigation});
      link.find('a')!.trigger('onClick', createClickEvent({shiftKey: true}));

      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not call navigation.navigate() when the meta key is pressed', () => {
      const navigation = new TestNavigation('https://example.com');
      const navigate = vi.spyOn(navigation, 'navigate');

      using link = render(<Link to="/" />, {navigation});
      link.find('a')!.trigger('onClick', createClickEvent({metaKey: true}));

      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not call navigation.navigate() when the control key is pressed', () => {
      const navigation = new TestNavigation('https://example.com');
      const navigate = vi.spyOn(navigation, 'navigate');

      using link = render(<Link to="/" />, {navigation});
      link.find('a')!.trigger('onClick', createClickEvent({ctrlKey: true}));

      expect(navigate).not.toHaveBeenCalled();
    });
  });
});

function createClickEvent({
  shiftKey = false,
  ctrlKey = false,
  metaKey = false,
} = {}) {
  let defaultPrevented = false;

  return {
    shiftKey,
    ctrlKey,
    metaKey,
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault: vi.fn(() => {
      defaultPrevented = true;
    }),
  };
}
