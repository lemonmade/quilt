// @vitest-environment jsdom

import {describe, it, expect, afterEach} from 'vitest';
import {render} from 'preact';
import {act} from 'preact/test-utils';

import {signal, useComputed, type Signal} from '../index.ts';

describe('useComputed()', () => {
  let container: HTMLElement;

  afterEach(() => {
    if (container) render(null, container);
    container?.remove();
  });

  function mount(element: preact.ComponentChild) {
    container ??= document.createElement('div');
    document.body.append(container);
    act(() => {
      render(element, container);
    });
  }

  it('reads the latest non-signal values when a signal triggers recomputation', () => {
    const count = signal(1);
    let lastComputed: Signal<string> | undefined;

    function Label({prefix}: {prefix: string}) {
      const label = useComputed(() => `${prefix}: ${count.value}`);
      lastComputed = label;
      return <span>{label}</span>;
    }

    mount(<Label prefix="first" />);
    expect(container.textContent).toBe('first: 1');

    const firstComputed = lastComputed;

    mount(<Label prefix="second" />);
    act(() => {
      count.value = 2;
    });

    expect(lastComputed).toBe(firstComputed);
    expect(lastComputed!.value).toBe('second: 2');
    expect(container.textContent).toBe('second: 2');
  });

  it('recreates the computed signal when an explicit argument changes', () => {
    const count = signal(1);
    let lastComputed: Signal<string> | undefined;

    function Label({prefix}: {prefix: string}) {
      const label = useComputed(() => `${prefix}: ${count.value}`, [prefix]);
      lastComputed = label;
      return <span>{label.value}</span>;
    }

    mount(<Label prefix="first" />);
    const firstComputed = lastComputed;

    mount(<Label prefix="second" />);

    expect(lastComputed).not.toBe(firstComputed);
    expect(container.textContent).toBe('second: 1');
  });
});
