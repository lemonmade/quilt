import {useRoutes} from '@quilted/quilt';
import {NotFound} from '@quilted/quilt/http';
import type {RouteDefinition} from '@quilted/quilt';

import {Start} from '../../features/Start';

const routes: RouteDefinition[] = [
  {match: '/', render: () => <Start />},
  {match: 'another', render: () => <Start />},
  {
    match: 'yet-another',
    children: [
      {match: 'foo', render: () => <Start />},
      {match: 'bar', render: () => <Start />},
      {render: () => <NotFound />},
    ],
  },
  {
    match: /\w+/,
    renderStatic: () => ['abc', 'xyz'],
    children: [
      {
        match: /\d+/,
        renderStatic: () => ['123', '456', '890'],
        children: [
          {match: 'foo', render: () => <Start />},
          {match: 'bar', render: () => <Start />},
        ],
      },
      {match: 'foo', render: () => <Start />},
      {match: 'bar', render: () => <Start />},
    ],
  },
  {
    children: [
      {match: 'and-another', render: () => <Start />},
      {render: () => <NotFound />},
    ],
  },
];

export function Routes() {
  return useRoutes(routes);
}
