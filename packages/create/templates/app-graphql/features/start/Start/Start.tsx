import {useGraphQLQuery} from '@quilted/react-query';

import styles from './Start.module.css';
import startQuery from './StartQuery.graphql';

export default function Start() {
  const {data} = useGraphQLQuery(startQuery);

  return (
    <div className={styles.Start}>
      {data ? `Hello ${data.me.name}!` : 'Hello!'}
    </div>
  );
}
