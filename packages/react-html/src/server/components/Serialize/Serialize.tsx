import React from 'react';
import serialize from 'serialize-javascript';

import {
  SERIALIZE_ID_ATTRIBUTE,
  SERIALIZE_VALUE_ATTRIBUTE,
} from '../../../utilities';

interface Props<Data> {
  id: string;
  data: Data;
}

export function Serialize<Data>({id, data}: Props<Data>) {
  const attributes = {
    [SERIALIZE_ID_ATTRIBUTE]: id,
    [SERIALIZE_VALUE_ATTRIBUTE]: serialize(data),
  };

  return <div {...attributes} />;
}
