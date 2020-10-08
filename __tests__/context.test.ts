import osm = require('os');

import {getInputs} from '../src/context';

test('without password getInputs throws errors', async () => {
  expect(() => {
    getInputs();
  }).toThrowError('Input required and not supplied: password');
});

test('with password getInputs does not error', async () => {
  process.env['INPUT_PASSWORD'] = 'groundcontrol';
  expect(() => {
    getInputs();
  }).not.toThrowError();
});
