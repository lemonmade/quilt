import {Component, cloneElement} from 'react';
import type {ReactElement, ReactNode} from 'react';

interface State<ComponentProps> {
  props?: Partial<ComponentProps>;
}

interface Props<ComponentProps> {
  children?: ReactNode;
  render?(element: ReactElement<ComponentProps>): ReactElement<ComponentProps>;
}

const defaultRender: NonNullable<Props<any>['render']> = (element) => element;

export class TestRenderer<ComponentProps> extends Component<
  Props<ComponentProps>,
  State<ComponentProps>
> {
  state: State<ComponentProps> = {};

  setProps(props: Partial<ComponentProps>) {
    this.setState({props});
  }

  render() {
    const {props} = this.state;
    const {children, render = defaultRender} = this.props;
    return render(
      props ? (cloneElement(children as any, props) as any) : children!,
    );
  }
}
