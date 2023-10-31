import {
  Component,
  cloneElement,
  type VNode,
  type ComponentChild,
  type ComponentChildren,
} from 'preact';

interface State<ComponentProps> {
  props?: Partial<ComponentProps>;
  error?: Error;
}

interface Props<ComponentProps> {
  children?: ComponentChildren;
  render?(element: VNode<ComponentProps>): ComponentChild;
}

const defaultRender: NonNullable<Props<any>['render']> = (element) => element;

export class TestRenderer<ComponentProps> extends Component<
  Props<ComponentProps>,
  State<ComponentProps>
> {
  static getDerivedStateFromError(error: any) {
    return {error};
  }

  state: State<ComponentProps> = {};

  setProps(props: Partial<ComponentProps>) {
    this.setState({props});
  }

  getError() {
    return this.state.error;
  }

  render() {
    const {props, error} = this.state;

    if (error) return null;

    const {children, render = defaultRender} = this.props;
    return render(
      props ? (cloneElement(children as any, props) as any) : children!,
    );
  }
}
