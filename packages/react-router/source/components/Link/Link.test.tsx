// @vitest-environment jsdom

import {describe, it, expect, vi} from 'vitest';

import {render, TestRouter} from '../../tests/utilities.tsx';

import {Link} from './Link.tsx';

describe('<Link />', () => {
  it('creates an anchor tag', () => {
    const link = render(<Link to="/" />);
    expect(link).toContainReactComponent('a', {href: '/'});
  });

  it('creates an anchor from a relative `to`', () => {
    const link = render(<Link to="my-product" />, {
      router: new TestRouter('https://example.com/products'),
    });

    expect(link).toContainReactComponent('a', {href: '/products/my-product'});
  });

  it('passes additional props through to the anchor tag', () => {
    const label = 'Home';
    const link = render(<Link to="/" aria-label={label} />);
    expect(link).toContainReactComponent('a', {'aria-label': label});
  });

  describe('onClick()', () => {
    it('calls the onClick() prop with the DOM event', () => {
      const onClick = vi.fn();
      const event = createClickEvent();

      const link = render(<Link to="/" onClick={onClick} />);
      link.find('a')!.trigger('onClick', event);

      expect(onClick).toHaveBeenCalledWith(event);
    });

    it('calls router.navigate() with the `to` prop for normal clicks', () => {
      const to = '/';
      const router = new TestRouter('https://example.com');
      const navigate = vi.spyOn(router, 'navigate');

      const link = render(<Link to={to} />, {router});
      link.find('a')!.trigger('onClick', createClickEvent());

      expect(navigate).toHaveBeenCalledWith(to);
    });

    it('does not call router.navigate() when the link is explicitly marked as `external`', () => {
      const router = new TestRouter('https://example.com');
      const navigate = vi.spyOn(router, 'navigate');

      const link = render(<Link to="/" external />, {router});
      link.find('a')!.trigger('onClick', createClickEvent());

      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not call router.navigate() when `onClick()` calls `event.preventDefault()`', () => {
      const router = new TestRouter('https://example.com');
      const navigate = vi.spyOn(router, 'navigate');

      const link = render(
        <Link to="/" onClick={(event) => event.preventDefault()} />,
        {router},
      );
      link.find('a')!.trigger('onClick', createClickEvent());

      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not call router.navigate() when the shift key is pressed', () => {
      const router = new TestRouter('https://example.com');
      const navigate = vi.spyOn(router, 'navigate');

      const link = render(<Link to="/" />, {router});
      link.find('a')!.trigger('onClick', createClickEvent({shiftKey: true}));

      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not call router.navigate() when the meta key is pressed', () => {
      const router = new TestRouter('https://example.com');
      const navigate = vi.spyOn(router, 'navigate');

      const link = render(<Link to="/" />, {router});
      link.find('a')!.trigger('onClick', createClickEvent({metaKey: true}));

      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not call router.navigate() when the control key is pressed', () => {
      const router = new TestRouter('https://example.com');
      const navigate = vi.spyOn(router, 'navigate');

      const link = render(<Link to="/" />, {router});
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
