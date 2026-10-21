(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});

  const C = '/psc/cs90prd_newwin/EMPLOYEE/SA/c/';
  const HOME = '/psc/cs90prd_2/EMPLOYEE/SA/c/NUI_FRAMEWORK.PT_LANDINGPAGE.GBL?lp=SA.EMPLOYEE.DEFAULT_LP';

  // Every EduRec tile, with the sub-pages it contains (used by search).
  const TILES = [
    { id: 'profile', comp: 'SCC_PROFILE_FL', label: 'Personal information', section: 'profile',
      path: C + 'SCC_PROFILE_FL.SCC_PROFILE_FL.GBL?GMenu=SCC_PROFILE_FL&GComp=SCC_PROFILE_FL&GPage=SCC_START_PAGE_FL&scname=CS_PERSON_PROFILE',
      pages: ['Demographic information', 'Names', 'Contact details', 'Addresses', 'Emergency contacts', 'Payment advice', 'MyInfo demographic information'] },
    { id: 'acadrec', comp: 'SSR_SP_ACAD_REC_FL', label: 'Academic records', section: 'timetable',
      path: C + 'SSR_STUDENT_ACAD_REC_FL.SSR_SP_ACAD_REC_FL.GBL?GMenu=SSR_STUDENT_ACAD_REC_FL&GComp=SSR_SP_ACAD_REC_FL&GPage=SCC_START_PAGE_FL&scname=CS_SSR_ACADEMIC_RECORDS_FL',
      pages: ['Academic programme', 'Student status letter', 'View courses', 'Term and course enrolment', 'View classes', 'Milestones', 'Transfer credit report', 'Leave of absence', 'EP eligibility letter', 'Student requests'] },
    { id: 'degree', comp: 'N_CC_ACAD_ADVIS_FL', label: 'Degree progress', section: 'degree',
      path: C + 'SA_LEARNER_SERVICES.N_CC_ACAD_ADVIS_FL.GBL?GMenu=SA_LEARNER_SERVICES&GComp=N_CC_ACAD_ADVIS_FL&GPage=SCC_START_PAGE_FL&scname=N_ACADEMIC_ADVISEMENT',
      pages: ['Graduation audit report', 'What-if report', 'Apply for graduation', 'Graduation status'] },
    { id: 'coursereg', comp: 'N_MRS_START_NAV_FL', label: 'Course registration', section: 'coursereg',
      path: C + 'N_STUDENT_RECORDS.N_MRS_START_NAV_FL.GBL?GMenu=N_STUDENT_RECORDS&GComp=N_MRS_START_NAV_FL&GPage=N_MRS_START_NAV_FL&scname=N_MRS_MODULE_REG_NAV',
      pages: ['My classes', 'Select courses', 'Submit course requests', 'Select tutorials and labs', 'Add or swap tutorials', 'Drop classes', 'Appeals and enquiries'] },
    { id: 'exams', comp: 'N_SS_EXAMINATNS_FL', label: 'Examinations', section: 'exams',
      path: C + 'SA_LEARNER_SERVICES.N_SS_EXAMINATNS_FL.GBL?GMenu=SA_LEARNER_SERVICES&GComp=N_SS_EXAMINATNS_FL&GPage=SCC_START_PAGE_FL&scname=N_EXAMINATIONS',
      pages: ['Exam schedule', 'Exam results', 'Grades', 'GPA', 'S/U declarations', 'Special consideration', 'Review exam results', 'SMS notification', 'S/U original grade letter'] },
    { id: 'transcripts', comp: 'N_SS_TSCRPTGRP_FL', label: 'Transcripts', section: 'documents',
      path: C + 'SA_LEARNER_SERVICES.N_SS_TSCRPTGRP_FL.GBL?GMenu=SA_LEARNER_SERVICES&GComp=N_SS_TSCRPTGRP_FL&GPage=SCC_START_PAGE_FL&scname=N_SR_TSCRPT_COLLECTION',
      pages: ['Unofficial transcript', 'Official transcript', 'Transcript application status', 'Student life transcript'] },
    { id: 'globaled', comp: 'N_CC_GLB_EDU_FL', label: 'Global education', section: 'globaled',
      path: C + 'SA_LEARNER_SERVICES.N_CC_GLB_EDU_FL.GBL?GMenu=SA_LEARNER_SERVICES&GComp=N_CC_GLB_EDU_FL&GPage=SCC_START_PAGE_FL&scname=N_GLOBAL_EDUCATION',
      pages: ['Exchange application', 'Search course mappings', 'Submit course mapping'] },
    { id: 'finances', comp: 'N_SF_SS_STD_FIN_FL', label: 'Student financials', section: 'finances',
      path: C + 'N_STUDENT_FINANCIALS.N_SF_SS_STD_FIN_FL.GBL?GMenu=N_STUDENT_FINANCIALS&GComp=N_SF_SS_STD_FIN_FL&GPage=N_SF_START_PAGE_FL&scname=N_SF_MANAGE_STUDENT_FIN_NAV',
      pages: ['Bills', 'Payments', 'Fees', 'Refunds'] },
    { id: 'finaid', comp: 'N_SF_FA_DISB_FL', label: 'Financial aid', section: 'finances',
      path: C + 'SA_LEARNER_SERVICES.N_SF_FA_DISB_FL.GBL',
      pages: ['Scholarship', 'Bursary', 'Disbursements'] },
    { id: 'regdecl', comp: 'N_AD_REG_DECLAR_FL', label: 'Registration & declarations', section: 'documents',
      path: '/psc/cs90prd_newwin/EMPLOYEE/PSFT_HR/c/SA_LEARNER_SERVICES.N_AD_REG_DECLAR_FL.GBL?GMenu=SA_LEARNER_SERVICES&GComp=N_AD_REG_DECLAR_FL&GPage=SCC_START_PAGE_FL&scname=N_REGISTRATION_DECLARATION',
      pages: ['QET/DET registration', 'Authorisation requirements', 'Declaration of transfer option'] },
    { id: 'plandecl', comp: 'N_STDNT_DEC_COL_FL', label: 'Plan application & declaration', section: 'documents',
      path: C + 'N_STUDENT_RECORDS.N_STDNT_DEC_COL_FL.GBL?GMenu=N_STUDENT_RECORDS&GComp=N_STDNT_DEC_COL_FL&GPage=SCC_START_PAGE_FL&scname=N_SD_DECLARE_FLD',
      pages: ['Declare minor', 'Declare second major', 'Restricted plan', 'Application outcome'] },
    { id: 'dyoc', comp: 'N_SR_DYOM_COL_FL', label: 'Design Your Own Course', section: 'documents',
      path: C + 'SA_LEARNER_SERVICES.N_SR_DYOM_COL_FL.GBL?GMenu=SA_LEARNER_SERVICES&GComp=N_SR_DYOM_COL_FL&GPage=SCC_START_PAGE_FL&scname=N_SR_DYOM_FL',
      pages: ['DYOC group application'] },
    { id: 'reqdes', comp: 'N_RD_START_PAGE_FL', label: 'Requirement designation', section: 'documents',
      path: C + 'N_STUDENT_RECORDS.N_RD_START_PAGE_FL.GBL?GMenu=N_STUDENT_RECORDS&GComp=N_RD_START_PAGE_FL&GPage=N_RD_START_PAGE_FL&scname=ADMN_REQUIREMENT_DESIGNATION',
      pages: ['Double degree requirement designation'] },
    { id: 'commencement', comp: 'N_SS_CMCMNT_REG_FL', label: 'Commencement registration', section: 'documents',
      path: C + 'SA_LEARNER_SERVICES.N_SS_CMCMNT_REG_FL.GBL', pages: ['Graduation ceremony'] },
    { id: 'dcr', comp: 'N_DCR_STD_START_FL', label: 'Workshop booking (DCR)', section: 'documents',
      path: C + 'N_DYNAMIC_COURSE_REGISTRATION.N_DCR_STD_HOMPG_FL.GBL?GMenu=N_DYNAMIC_COURSE_REGISTRATION&GComp=N_DCR_STD_START_FL&GPage=SCC_START_PAGE_FL&scname=N_DCR_STD_SESS_FL',
      pages: ['Respect and consent workshop', 'Book session', 'Confirmed sessions', 'Drop session'] },
    { id: 'fieldwork', comp: 'N_FMS_STD_HOMPG_FL', label: 'Fieldwork log', section: 'documents',
      path: C + 'N_FIELDWORK_SYSTEM.N_FMS_STD_HOMPG_FL.GBL?GMenu=N_FIELDWORK_SYSTEM&GComp=N_FMS_STD_HOMPG_FL&GPage=SCC_START_PAGE_FL&scname=N_FMS_STDNT_LOG',
      pages: ['Internship hours', 'Log sheet'] },
    { id: 'guides', comp: 'N_CC_EXT_URL_FL', label: 'User guides & links', section: 'documents',
      path: C + 'N_CAMPUS_COMMUNITY.N_CC_EXT_URL_FL.GBL', pages: ['Help', 'IT Care', 'Canvas'] }
  ];

  const SECTIONS = [
    { id: 'home', label: 'Overview', href: HOME + '#overview', icon: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
    { id: 'timetable', label: 'Courses & records', tile: 'acadrec', icon: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4' },
    { id: 'exams', label: 'Results & exams', tile: 'exams', icon: 'M5 20V11M12 20V5M19 20v-6' },
    { id: 'degree', label: 'Degree progress', tile: 'degree', icon: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5' },
    { id: 'coursereg', label: 'Course registration', tile: 'coursereg', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16.5 13v7M13 16.5h7' },
    { id: 'finances', label: 'Finances', tile: 'finaid', icon: 'M3 7h18v12H3zM3 11h18M7 15h3' },
    { id: 'documents', label: 'Documents & requests', tile: 'transcripts', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6' },
    { id: 'globaled', label: 'Global education', tile: 'globaled', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18' },
    { id: 'profile', label: 'Personal information', tile: 'profile', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6' }
  ];

  // Commonly needed pages, each opened straight on its sub-page: the tile URL plus
  // #edr-open=<page-list label>, which the shell clicks once the page loads.
  const SHORTCUTS = [
    { id: 'transcript', label: 'Unofficial transcript', tile: 'exams', open: 'View Unofficial Transcript', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6' },
    { id: 'results', label: 'Exam results', tile: 'exams', open: 'View Exam Results', icon: 'M5 20V11M12 20V5M19 20v-6' },
    { id: 'examtimes', label: 'Exam schedule', tile: 'exams', open: 'View Exam Schedule', icon: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4M8 14h3' },
    { id: 'register', label: 'Course registration', tile: 'coursereg', open: 'Select Courses', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16.5 13v7M13 16.5h7' },
    { id: 'su', label: 'S/U declarations', tile: 'exams', open: 'Submit S/U Declarations', icon: 'M5 12.5l4.5 4.5L19 7.5' }
  ];
  // Not a quick link, but the Up next card opens View Classes the same way.
  const TIMETABLE_LINK = { id: 'timetable', tile: 'acadrec', open: 'View Classes' };
  const isOpenable = (label) => SHORTCUTS.concat(TIMETABLE_LINK).some((sc) => sc.open === label);

  const byId = Object.fromEntries(TILES.map((t) => [t.id, t]));
  const byComp = Object.fromEntries(TILES.map((t) => [t.comp, t]));

  function shortcutHref(sc) {
    return byId[sc.tile].path + '#edr-open=' + encodeURIComponent(sc.open);
  }

  function sectionHref(section) {
    return section.href || byId[section.tile].path;
  }

  // Works out which EduRec page a URL is. PeopleSoft redirects tile URLs to
  // wrapper components but keeps the original component in GComp.
  function detectPage(href) {
    let url;
    try { url = new URL(href, 'https://myedurec.nus.edu.sg'); } catch (e) { return { key: 'other', section: null }; }
    const params = url.searchParams;
    const seg = url.pathname.split('/c/')[1] || '';
    const pathComp = seg.split('.')[1] || '';
    if (pathComp === 'PT_LANDINGPAGE') {
      const lp = params.get('lp');
      const home = !lp || lp === 'SA.EMPLOYEE.DEFAULT_LP';
      return { key: home ? 'home' : 'landing', section: home ? 'home' : null };
    }
    const comp = params.get('GComp') || pathComp;
    const tile = byComp[comp] || TILES.find((t) => seg.includes(t.comp));
    if (!tile) return { key: 'other', section: null, comp };
    return { key: tile.id, section: tile.section, comp, tile };
  }

  // NUS academic calendar: Sem 1 from August, Sem 2 from January, special terms mid-year.
  function termFor(date) {
    const y = date.getFullYear();
    const m = date.getMonth();
    if (m >= 7) return { ay: y + '/' + (y + 1), label: 'Semester 1' };
    if (m <= 4) return { ay: (y - 1) + '/' + y, label: 'Semester 2' };
    return { ay: (y - 1) + '/' + y, label: 'Special Term' };
  }

  // Flat list of search destinations: every tile and every sub-page inside it.
  function searchIndex() {
    const out = [{ label: 'Overview', hint: 'Home', href: HOME, keys: 'home overview dashboard' }];
    for (const sc of SHORTCUTS) out.push({ label: sc.label, hint: 'Shortcut', href: shortcutHref(sc), keys: (sc.label + ' ' + sc.open).toLowerCase() });
    for (const t of TILES) {
      out.push({ label: t.label, hint: 'Section', href: t.path, keys: (t.label + ' ' + t.pages.join(' ')).toLowerCase() });
      for (const p of t.pages) out.push({ label: p, hint: t.label, href: t.path, keys: (p + ' ' + t.label).toLowerCase() });
    }
    return out;
  }

  function search(query, index) {
    const q = query.toLowerCase().trim();
    const list = index || searchIndex();
    if (!q) return SHORTCUTS.map((sc) => ({ label: sc.label, hint: 'Shortcut', href: shortcutHref(sc) }))
      .concat(list.filter((r) => r.hint === 'Section' || r.hint === 'Home'));
    const words = q.split(/\s+/);
    return list
      .map((r) => {
        const label = r.label.toLowerCase();
        if (!words.every((w) => r.keys.includes(w))) return null;
        const score = (label.startsWith(q) ? 0 : label.includes(q) ? 1 : 2) + (r.hint === 'Section' ? 0 : 0.5);
        return { r, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score)
      .map((x) => x.r);
  }

  EDR.routes = { TILES, SECTIONS, SHORTCUTS, TIMETABLE_LINK, isOpenable, HOME, byId, sectionHref, shortcutHref, detectPage, termFor, searchIndex, search,
    logoutHref: 'https://myedurec.nus.edu.sg/psp/cs90prd_2/EMPLOYEE/SA/?cmd=logout' };
})();
