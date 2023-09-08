import {expect, test} from '@jest/globals';

import {getInputs} from '../src/context';

test('with password and username getInputs does not throw error', async () => {
  process.env['INPUT_USERNAME'] = 'dbowie';
  process.env['INPUT_PASSWORD'] = 'groundcontrol';
  process.env['INPUT_LOGOUT'] = 'true';
  expect(() => {
    getInputs();
  }).not.toThrow();
});
