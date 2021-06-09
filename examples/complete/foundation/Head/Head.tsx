import {Title, Viewport, Favicon} from '@quilted/quilt/html';

export function Head() {
  return (
    <>
      <Title>App</Title>
      <Favicon emoji="🤖" />
      <Viewport />
    </>
  );
}
