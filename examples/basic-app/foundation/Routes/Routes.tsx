import {useRoutes} from '@quilted/quilt';
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
    ],
  },
  {
    match: /\w{3}/,
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
    children: [{match: 'and-another', render: () => <Start />}],
  },
];

export function Routes() {
  return useRoutes(routes);
}
