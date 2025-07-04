import { faker } from '@faker-js/faker';
import { createAvatar } from '@dicebear/core';
import { dylan } from '@dicebear/collection';

export function generateUserProfile() {
  const noun = faker.word.noun({ length: { min: 2, max: 4 } });
  const adjective = faker.word.adjective({ length: { min: 2, max: 4 } });
  const userName = `${adjective}_${noun}`;

  const avatar = createAvatar(dylan, {
    seed: userName,
    scale: 100,
    backgroundType: ["gradientLinear", "solid"]
  }).toDataUri();

  return {
    userName,
    avatar
  };
}
