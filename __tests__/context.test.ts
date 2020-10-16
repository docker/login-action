import osm = require('os');

import {getInputs} from '../src/context';

test('without username getInputs throws errors', async () => {
  expect(() => {
    getInputs();
  }).toThrowError('Input required and not supplied: username');
});

test('without password getInputs throws errors', async () => {
  process.env['INPUT_USERNAME'] = 'dbowie';
  expect(() => {
    getInputs();
  }).toThrowError('Input required and not supplied: password');
});

test('with password and username getInputs does not error', async () => {
  process.env['INPUT_USERNAME'] = 'dbowie';
  process.env['INPUT_PASSWORD'] = 'groundcontrol';
  expect(() => {
    getInputs();
  }).not.toThrowError();
});
