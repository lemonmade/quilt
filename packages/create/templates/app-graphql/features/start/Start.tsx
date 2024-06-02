import {useGraphQLQuery} from '@quilted/quilt/graphql';

import styles from './Start.module.css';
import startQuery from './StartQuery.graphql';

export default function Start() {
  const query = useGraphQLQuery(startQuery);

  const me = query.result?.data?.me;
  const greeting = me ? `Hello ${me.name}!` : 'Hello!';

  return <div className={styles.Start}>{greeting}</div>;
}
