import {cloneElement, forwardRef, useState, useImperativeHandle} from 'react';
import type {ReactNode, Ref, ReactElement} from 'react';

interface Props<ComponentProps = unknown> {
  children?: ReactNode;
  render?(element: ReactElement<ComponentProps>): ReactElement<ComponentProps>;
}

export interface ImperativeApi<ComponentProps = unknown> {
  setProps(props: Partial<ComponentProps>): void;
}

const defaultRender: NonNullable<Props['render']> = (element) => element;

export const TestRenderer = forwardRef<ImperativeApi, Props>(
  ({children, render = defaultRender}: Props, ref) => {
    const [props, setProps] = useState<unknown>();

    useImperativeHandle(ref, () => ({
      setProps(newProps) {
        setProps(newProps);
      },
    }));

    return render(
      props ? (cloneElement(children as any, props as any) as any) : children!,
    );
  },
) as <ComponentProps>(
  props: Props<ComponentProps> & {ref?: Ref<ImperativeApi<ComponentProps>>},
) => ReactElement | null;
