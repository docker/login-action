import osm = require('os');

import {getInputs} from '../src/context';

test('with password and username getInputs does not throw error', async () => {
  process.env['INPUT_USERNAME'] = 'dbowie';
  process.env['INPUT_PASSWORD'] = 'groundcontrol';
  expect(() => {
    getInputs();
  }).not.toThrowError();
});
