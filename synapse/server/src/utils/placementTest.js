import assert from 'node:assert/strict';
import {
    findSkillsInText,
    getRoleSkills,
    normalizeSkill,
    ROLE_SKILLS,
} from '../data/skillCatalog.js';

let failures = 0;

const check = (name, assertion) => {
    try {
        assertion();
        console.log(`PASS ${name}`);
    } catch (error) {
        failures += 1;
        console.log(`FAIL ${name}: ${error.message}`);
    }
};

check('normalizes React.js alias', () => {
    assert.equal(normalizeSkill('React.js'), 'react');
});

check('normalizes Node.JS alias with whitespace', () => {
    assert.equal(normalizeSkill('  Node.JS '), 'node');
});

check('matches canonical skills and aliases in text', () => {
    const skills = findSkillsInText('Built a ReactJS app with Node.js and PostgreSQL');
    assert.ok(skills.includes('react'));
    assert.ok(skills.includes('node'));
    assert.ok(skills.includes('postgresql'));
});

check('does not match unrelated skills', () => {
    assert.ok(!findSkillsInText('I know Javascript').includes('express'));
});

check('unknown role has no skills', () => {
    assert.deepEqual(getRoleSkills('Unknown Role'), []);
});

check('each role has at least four skills', () => {
    Object.values(ROLE_SKILLS).forEach((skills) => assert.ok(skills.length >= 4));
});

if (failures > 0) process.exitCode = 1;
