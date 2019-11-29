import React from 'react';
import serialize from 'serialize-javascript';

import {SERIALIZE_ATTRIBUTE} from '../../../utilities';

interface Props<Data> {
  id: string;
  data: Data;
}

export function Serialize<Data>({id, data}: Props<Data>) {
  return (
    <script
      type="text/json"
      dangerouslySetInnerHTML={{__html: serialize(data)}}
      {...{[SERIALIZE_ATTRIBUTE]: id}}
    />
  );
}
