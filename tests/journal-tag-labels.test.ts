import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBehaviorLabelKey,
  getDistortionLabelKey,
  getThinkingLevelLabelKey,
} from '../src/lib/journal/tag-labels.ts';

test('getThinkingLevelLabelKey maps stored thinking tags to translation keys', () => {
  assert.equal(getThinkingLevelLabelKey('thinking:L2'), 'thinkingLevelLabels.L2');
  assert.equal(getThinkingLevelLabelKey('L2'), null);
});

test('getDistortionLabelKey maps stored distortion tags to translation keys', () => {
  assert.equal(
    getDistortionLabelKey('distortion:mind-reading'),
    'distortionLabels.mind-reading'
  );
  assert.equal(getDistortionLabelKey('mind-reading'), null);
});

test('getBehaviorLabelKey maps stored behavior tags to translation keys', () => {
  assert.equal(
    getBehaviorLabelKey('behavior:over-compensate'),
    'behaviorLabels.over-compensate'
  );
  assert.equal(getBehaviorLabelKey('over-compensate'), null);
});
