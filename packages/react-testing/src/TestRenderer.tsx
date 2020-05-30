import React, {ReactElement, ReactNode} from 'react';

interface State<ChildProps> {
  props?: Partial<ChildProps>;
}

interface Props {
  children?: ReactNode;
  render?(element: ReactElement<any>): ReactElement<any>;
}

const defaultRender: NonNullable<Props['render']> = (element) => element;

export class TestRenderer<ChildProps> extends React.Component<
  Props,
  State<ChildProps>
> {
  state: State<ChildProps> = {};

  setProps(props: Partial<ChildProps>) {
    this.setState({props});
  }

  render() {
    const {props} = this.state;
    const {children, render = defaultRender} = this.props;
    return render(
      props ? (React.cloneElement(children as any, props) as any) : children!,
    );
  }
}
