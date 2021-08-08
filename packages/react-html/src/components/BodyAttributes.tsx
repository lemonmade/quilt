import {useBodyAttributes} from '../hooks';

type Props = Parameters<typeof useBodyAttributes>[0];

/**
 * Sets the provided attributes on the `<body>` element.
 */
export function BodyAttributes(props: Props) {
  useBodyAttributes(props);
  return null;
}
