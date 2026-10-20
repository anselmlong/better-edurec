import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../src/routes.js');
const { detectPage, termFor, search, TILES, SECTIONS, sectionHref } = globalThis.EDR.routes;

test('detectPage recognises the homepage and other landing pages', () => {
  assert.equal(detectPage('https://myedurec.nus.edu.sg/psc/cs90prd_2/EMPLOYEE/SA/c/NUI_FRAMEWORK.PT_LANDINGPAGE.GBL?&lp=SA.EMPLOYEE.DEFAULT_LP').key, 'home');
  assert.equal(detectPage('https://myedurec.nus.edu.sg/psc/cs90prd_2/EMPLOYEE/SA/c/NUI_FRAMEWORK.PT_LANDINGPAGE.GBL').key, 'home');
  assert.equal(detectPage('https://myedurec.nus.edu.sg/psc/cs90prd_2/EMPLOYEE/SA/c/NUI_FRAMEWORK.PT_LANDINGPAGE.GBL?lp=SA.EMPLOYEE.N_STD_ACAD').key, 'landing');
});

test('detectPage uses GComp when PeopleSoft redirects to a wrapper component', () => {
  const p = detectPage('https://myedurec.nus.edu.sg/psc/cs90prd_17/EMPLOYEE/SA/c/SA_LEARNER_SERVICES.N_AD_REG_NAVCOL_FL.GBL?Action=U&MD=Y&GMenu=SA_LEARNER_SERVICES&GComp=N_SS_EXAMINATNS_FL&GPage=SCC_START_PAGE_FL');
  assert.equal(p.key, 'exams');
  assert.equal(p.section, 'exams');
});

test('detectPage falls back to the component in the path', () => {
  assert.equal(detectPage('https://myedurec.nus.edu.sg/psc/cs90prd_41/EMPLOYEE/SA/c/SA_LEARNER_SERVICES.N_SF_FA_DISB_FL.GBL').key, 'finaid');
  assert.equal(detectPage('https://myedurec.nus.edu.sg/psc/cs90prd_8/EMPLOYEE/SA/c/SSR_STUDENT_ACAD_REC_FL.SSR_MD_ACAD_REC_FL.GBL?Action=U&MD=Y&GComp=SSR_SP_ACAD_REC_FL').key, 'acadrec');
  assert.equal(detectPage('https://myedurec.nus.edu.sg/psc/x/EMPLOYEE/SA/c/UNKNOWN.THING.GBL').key, 'other');
});

test('termFor follows the NUS calendar', () => {
  assert.deepEqual(termFor(new Date(2026, 9, 21)), { ay: '2026/2027', label: 'Semester 1' });
  assert.deepEqual(termFor(new Date(2027, 1, 3)), { ay: '2026/2027', label: 'Semester 2' });
  assert.deepEqual(termFor(new Date(2027, 5, 10)), { ay: '2026/2027', label: 'Special Term' });
});

test('search finds sub-pages and ranks label matches first', () => {
  const hits = search('transcript');
  assert.ok(hits.length >= 3);
  assert.match(hits[0].label, /transcript/i);
  assert.ok(search('gpa').some((r) => r.hint === 'Examinations'));
  assert.deepEqual(search('zzzz-no-match'), []);
});

test('every section links somewhere and every tile has a path', () => {
  for (const s of SECTIONS) assert.match(sectionHref(s), /^\/psc\//);
  for (const t of TILES) assert.match(t.path, /^\/psc\/cs90prd_newwin\//);
});
