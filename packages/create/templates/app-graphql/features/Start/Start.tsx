import {usePerformanceNavigation} from '@quilted/quilt';
import {useGraphQLQuery} from '@quilted/react-query';

import styles from './Start.module.css';
import startQuery from './StartQuery.graphql';

export default function Start() {
  const {data, isLoading} = useGraphQLQuery(startQuery);

  // This hook indicates that the page has loaded. It is used as part of Quilt’s
  // navigation performance tracking feature. If you have disabled this feature,
  // you can remove this hook.
  usePerformanceNavigation({state: isLoading ? 'loading' : 'complete'});

  return (
    <div className={styles.Start}>
      {data ? `Hello ${data.name}!` : 'Hello!'}
    </div>
  );
}
