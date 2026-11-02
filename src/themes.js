(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});

  // Every theme sets the full token set below; test/themes.test.mjs checks that
  // and the WCAG contrast of the pairs people actually read.
  const TOKENS = [
    'bg', 'surface', 'surface-2', 'surface-3', 'ink', 'ink-2', 'muted',
    'line', 'line-2', 'line-strong',
    'navy', 'navy-ink', 'on-primary', 'selected-ink', 'tint',
    'blue', 'blue-ink', 'warn', 'warn-bg', 'orange',
    'brand-bg', 'brand-ink', 'brand-sub', 'brand-hover',
    'inverse-bg', 'inverse-ink', 'inverse-muted', 'inverse-line',
    'selection', 'shadow-rgb'
  ];

  const SANS = '"Public Sans", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const MONO = '"IBM Plex Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
  const ROUNDED = 'ui-rounded, "SF Pro Rounded", "Nunito", "Quicksand", system-ui, sans-serif';
  const COMIC = '"Comic Sans MS", "Comic Neue", "Chalkboard SE", "Comic Relief", cursive';
  const SERIF = '"Iowan Old Style", "Charter", "Georgia", "Times New Roman", serif';
  const RETRO = '"Tahoma", "Verdana", "MS Sans Serif", "Segoe UI", sans-serif';
  const READABLE = '"Atkinson Hyperlegible Next", "Atkinson Hyperlegible", "Verdana", system-ui, sans-serif';

  const dark = (t) => ({ 'brand-hover': 'rgba(255, 255, 255, .08)', 'shadow-rgb': '0 0 0', ...t });

  const THEMES = [
    { id: 'campus', label: 'Campus', dark: false, tokens: {
      bg: '#F4F6F9', surface: '#FFFFFF', 'surface-2': '#F5F7FA', 'surface-3': '#F0F2F5',
      ink: '#16202E', 'ink-2': '#34404F', muted: '#5B6675', line: '#DCE1E7', 'line-2': '#EDF0F3', 'line-strong': '#C5CED9',
      navy: '#123A6B', 'navy-ink': '#0E2E55', 'on-primary': '#FFFFFF', 'selected-ink': '#123A6B', tint: '#E5EEF8',
      blue: '#1F5AA6', 'blue-ink': '#174A87', warn: '#9A3F00', 'warn-bg': '#FDEBE1', orange: '#E0620D',
      'brand-bg': '#123A6B', 'brand-ink': '#FFFFFF', 'brand-sub': '#C9D6E6', 'brand-hover': 'rgba(255, 255, 255, .14)',
      'inverse-bg': '#16202E', 'inverse-ink': '#FFFFFF', 'inverse-muted': '#C9D2DC', 'inverse-line': 'rgba(255, 255, 255, .25)',
      selection: '#CFE0F5', 'shadow-rgb': '16 32 46' } },

    { id: 'midnight', label: 'Dark', dark: true, tokens: dark({
      bg: '#0E131A', surface: '#151C26', 'surface-2': '#1B2430', 'surface-3': '#212B39',
      ink: '#E7ECF3', 'ink-2': '#C5CEDA', muted: '#97A3B4', line: '#2A3443', 'line-2': '#202936', 'line-strong': '#3A4657',
      navy: '#2D69D6', 'navy-ink': '#255BC0', 'on-primary': '#FFFFFF', 'selected-ink': '#9CC3FF', tint: '#1D2C44',
      blue: '#82B4FF', 'blue-ink': '#A8CBFF', warn: '#FFB27A', 'warn-bg': '#3A281B', orange: '#FF8A3D',
      'brand-bg': '#0A0F15', 'brand-ink': '#E7ECF3', 'brand-sub': '#97A3B4',
      'inverse-bg': '#E7ECF3', 'inverse-ink': '#0E131A', 'inverse-muted': '#3A4657', 'inverse-line': 'rgba(14, 19, 26, .25)',
      selection: '#2B4A7A' }) },

    { id: 'girlypop', label: 'Girlypop', dark: false, font: ROUNDED, radius: '16px', radiusSm: '10px', tokens: {
      bg: '#FFF0F6', surface: '#FFFFFF', 'surface-2': '#FFE6F0', 'surface-3': '#FFDCEB',
      ink: '#3B0A2A', 'ink-2': '#5A1A42', muted: '#8A4870', line: '#F7C6DA', 'line-2': '#FCE3EE', 'line-strong': '#EFA3C3',
      navy: '#C2185B', 'navy-ink': '#A0144B', 'on-primary': '#FFFFFF', 'selected-ink': '#A0144B', tint: '#FFD6E8',
      blue: '#B0156A', 'blue-ink': '#8E1156', warn: '#A33A12', 'warn-bg': '#FFE9DC', orange: '#FF6FA8',
      'brand-bg': '#C2185B', 'brand-ink': '#FFFFFF', 'brand-sub': '#FFD6E8', 'brand-hover': 'rgba(255, 255, 255, .16)',
      'inverse-bg': '#3B0A2A', 'inverse-ink': '#FFFFFF', 'inverse-muted': '#F7C6DA', 'inverse-line': 'rgba(255, 255, 255, .25)',
      selection: '#FFC2DC', 'shadow-rgb': '120 20 70' } },

    { id: 'terminal', label: 'Terminal', dark: true, font: MONO, radius: '0px', radiusSm: '0px', tokens: dark({
      bg: '#050805', surface: '#0A100A', 'surface-2': '#0F180F', 'surface-3': '#132013',
      ink: '#B8F7AE', 'ink-2': '#9FE394', muted: '#74B56B', line: '#1E3A1E', 'line-2': '#152915', 'line-strong': '#2C562C',
      navy: '#39FF14', 'navy-ink': '#7DFF5E', 'on-primary': '#031003', 'selected-ink': '#39FF14', tint: '#102A10',
      blue: '#7CFFB0', 'blue-ink': '#A6FFC9', warn: '#FFD166', 'warn-bg': '#2A2405', orange: '#FFD166',
      'brand-bg': '#000000', 'brand-ink': '#39FF14', 'brand-sub': '#74B56B', 'brand-hover': 'rgba(57, 255, 20, .12)',
      'inverse-bg': '#39FF14', 'inverse-ink': '#031003', 'inverse-muted': '#0F3A0A', 'inverse-line': 'rgba(3, 16, 3, .3)',
      selection: '#1E4A1E' }) },

    { id: 'monokai', label: 'Monokai', dark: true, tokens: dark({
      bg: '#272822', surface: '#2D2E27', 'surface-2': '#35362F', 'surface-3': '#3E3D32',
      ink: '#F8F8F2', 'ink-2': '#E6E6DA', muted: '#B3AD92', line: '#49483E', 'line-2': '#3A3B33', 'line-strong': '#5E5D50',
      navy: '#A6E22E', 'navy-ink': '#B8F04A', 'on-primary': '#1E1F1A', 'selected-ink': '#A6E22E', tint: '#3E3D32',
      blue: '#66D9EF', 'blue-ink': '#8BE4F5', warn: '#FD971F', 'warn-bg': '#3D3020', orange: '#F92672',
      'brand-bg': '#1E1F1A', 'brand-ink': '#F8F8F2', 'brand-sub': '#B3AD92',
      'inverse-bg': '#F8F8F2', 'inverse-ink': '#272822', 'inverse-muted': '#5E5D50', 'inverse-line': 'rgba(39, 40, 34, .25)',
      selection: '#49483E' }) },

    { id: 'dracula', label: 'Dracula', dark: true, tokens: dark({
      bg: '#282A36', surface: '#2F3241', 'surface-2': '#363A4B', 'surface-3': '#3E4256',
      ink: '#F8F8F2', 'ink-2': '#E2E2DC', muted: '#A9B1D6', line: '#44475A', 'line-2': '#383B4D', 'line-strong': '#565A73',
      navy: '#BD93F9', 'navy-ink': '#CDAEFB', 'on-primary': '#1E1F29', 'selected-ink': '#D4BBFB', tint: '#3D4054',
      blue: '#8BE9FD', 'blue-ink': '#B1F1FE', warn: '#FFB86C', 'warn-bg': '#45372A', orange: '#FF79C6',
      'brand-bg': '#21222C', 'brand-ink': '#F8F8F2', 'brand-sub': '#A9B1D6',
      'inverse-bg': '#F8F8F2', 'inverse-ink': '#282A36', 'inverse-muted': '#565A73', 'inverse-line': 'rgba(40, 42, 54, .25)',
      selection: '#44475A' }) },

    { id: 'nord', label: 'Nord', dark: true, tokens: dark({
      bg: '#2E3440', surface: '#3B4252', 'surface-2': '#434C5E', 'surface-3': '#4C566A',
      ink: '#ECEFF4', 'ink-2': '#E5E9F0', muted: '#C3CBD8', line: '#4C566A', 'line-2': '#434C5E', 'line-strong': '#5E6B82',
      navy: '#88C0D0', 'navy-ink': '#8FBCBB', 'on-primary': '#2E3440', 'selected-ink': '#A3D3E0', tint: '#434C5E',
      blue: '#88C0D0', 'blue-ink': '#A3D3E0', warn: '#EBCB8B', 'warn-bg': '#4A4537', orange: '#D08770',
      'brand-bg': '#2B303B', 'brand-ink': '#ECEFF4', 'brand-sub': '#C3CBD8',
      'inverse-bg': '#ECEFF4', 'inverse-ink': '#2E3440', 'inverse-muted': '#4C566A', 'inverse-line': 'rgba(46, 52, 64, .25)',
      selection: '#4C566A' }) },

    { id: 'solarized', label: 'Solarized Light', dark: false, tokens: {
      bg: '#FDF6E3', surface: '#FFFBF0', 'surface-2': '#F5EEDA', 'surface-3': '#EEE8D5',
      ink: '#073642', 'ink-2': '#2B4A53', muted: '#586E75', line: '#E3DCC6', 'line-2': '#EEE8D5', 'line-strong': '#D3CBB2',
      navy: '#1A6BA8', 'navy-ink': '#155A8E', 'on-primary': '#FFFFFF', 'selected-ink': '#155A8E', tint: '#EAE3CB',
      blue: '#1A6BA8', 'blue-ink': '#155A8E', warn: '#A0420F', 'warn-bg': '#F7E3CF', orange: '#CB4B16',
      'brand-bg': '#073642', 'brand-ink': '#FDF6E3', 'brand-sub': '#93A1A1', 'brand-hover': 'rgba(255, 255, 255, .1)',
      'inverse-bg': '#073642', 'inverse-ink': '#FDF6E3', 'inverse-muted': '#93A1A1', 'inverse-line': 'rgba(253, 246, 227, .25)',
      selection: '#E6DFC5', 'shadow-rgb': '7 54 66' } },

    { id: 'gruvbox', label: 'Gruvbox', dark: true, tokens: dark({
      bg: '#282828', surface: '#32302F', 'surface-2': '#3C3836', 'surface-3': '#504945',
      ink: '#EBDBB2', 'ink-2': '#D5C4A1', muted: '#BDAE93', line: '#504945', 'line-2': '#3C3836', 'line-strong': '#665C54',
      navy: '#FABD2F', 'navy-ink': '#FFD15C', 'on-primary': '#282828', 'selected-ink': '#FABD2F', tint: '#3C3836',
      blue: '#83A598', 'blue-ink': '#A5C3B8', warn: '#FE8019', 'warn-bg': '#4A3220', orange: '#FE8019',
      'brand-bg': '#1D2021', 'brand-ink': '#EBDBB2', 'brand-sub': '#BDAE93',
      'inverse-bg': '#EBDBB2', 'inverse-ink': '#282828', 'inverse-muted': '#665C54', 'inverse-line': 'rgba(40, 40, 40, .25)',
      selection: '#504945' }) },

    { id: 'catppuccin', label: 'Catppuccin', dark: true, tokens: dark({
      bg: '#1E1E2E', surface: '#262637', 'surface-2': '#313244', 'surface-3': '#3A3B52',
      ink: '#CDD6F4', 'ink-2': '#BAC2DE', muted: '#A6ADC8', line: '#45475A', 'line-2': '#313244', 'line-strong': '#585B70',
      navy: '#CBA6F7', 'navy-ink': '#D9BEFA', 'on-primary': '#1E1E2E', 'selected-ink': '#CBA6F7', tint: '#313244',
      blue: '#89B4FA', 'blue-ink': '#B4CEFC', warn: '#FAB387', 'warn-bg': '#3F3333', orange: '#FAB387',
      'brand-bg': '#181825', 'brand-ink': '#CDD6F4', 'brand-sub': '#A6ADC8',
      'inverse-bg': '#CDD6F4', 'inverse-ink': '#1E1E2E', 'inverse-muted': '#585B70', 'inverse-line': 'rgba(30, 30, 46, .25)',
      selection: '#45475A' }) },

    { id: 'rosepine', label: 'Rosé Pine', dark: true, tokens: dark({
      bg: '#191724', surface: '#1F1D2E', 'surface-2': '#26233A', 'surface-3': '#2E2A45',
      ink: '#E0DEF4', 'ink-2': '#CFCBE6', muted: '#A9A5C4', line: '#393552', 'line-2': '#2A273F', 'line-strong': '#524F67',
      navy: '#EBBCBA', 'navy-ink': '#F2D0CE', 'on-primary': '#191724', 'selected-ink': '#EBBCBA', tint: '#2A273F',
      blue: '#9CCFD8', 'blue-ink': '#BFE1E7', warn: '#F6C177', 'warn-bg': '#3A2F2A', orange: '#EB6F92',
      'brand-bg': '#16141F', 'brand-ink': '#E0DEF4', 'brand-sub': '#A9A5C4',
      'inverse-bg': '#E0DEF4', 'inverse-ink': '#191724', 'inverse-muted': '#524F67', 'inverse-line': 'rgba(25, 23, 36, .25)',
      selection: '#393552' }) },

    { id: 'tokyonight', label: 'Tokyo Night', dark: true, tokens: dark({
      bg: '#1A1B26', surface: '#1F2335', 'surface-2': '#24283B', 'surface-3': '#292E42',
      ink: '#C0CAF5', 'ink-2': '#A9B1D6', muted: '#9AA5CE', line: '#2F3549', 'line-2': '#24283B', 'line-strong': '#3B4261',
      navy: '#7AA2F7', 'navy-ink': '#9BB8FA', 'on-primary': '#1A1B26', 'selected-ink': '#7AA2F7', tint: '#292E42',
      blue: '#7DCFFF', 'blue-ink': '#A5DEFF', warn: '#E0AF68', 'warn-bg': '#3A3226', orange: '#FF9E64',
      'brand-bg': '#16161E', 'brand-ink': '#C0CAF5', 'brand-sub': '#9AA5CE',
      'inverse-bg': '#C0CAF5', 'inverse-ink': '#1A1B26', 'inverse-muted': '#3B4261', 'inverse-line': 'rgba(26, 27, 38, .25)',
      selection: '#33467C' }) },

    { id: 'comic', label: 'Comic', dark: false, font: COMIC, radius: '14px', radiusSm: '10px', tokens: {
      bg: '#FFF6D6', surface: '#FFFDF5', 'surface-2': '#FFF1C2', 'surface-3': '#FFE89A',
      ink: '#111111', 'ink-2': '#2B2B2B', muted: '#5A4B2E', line: '#111111', 'line-2': '#E9D9A6', 'line-strong': '#111111',
      navy: '#D7261E', 'navy-ink': '#B01E17', 'on-primary': '#FFFFFF', 'selected-ink': '#0B3FA8', tint: '#D9E6FF',
      blue: '#0B4FC4', 'blue-ink': '#083C96', warn: '#A33A00', 'warn-bg': '#FFE3C7', orange: '#FFB800',
      'brand-bg': '#0B4FC4', 'brand-ink': '#FFFFFF', 'brand-sub': '#FFE89A', 'brand-hover': 'rgba(255, 255, 255, .18)',
      'inverse-bg': '#111111', 'inverse-ink': '#FFF6D6', 'inverse-muted': '#E9D9A6', 'inverse-line': 'rgba(255, 246, 214, .3)',
      selection: '#FFE066', 'shadow-rgb': '17 17 17' } },

    { id: 'kopi', label: 'Kopi', dark: false, tokens: {
      bg: '#F5EEE3', surface: '#FFFBF5', 'surface-2': '#F3E9DA', 'surface-3': '#EADCC6',
      ink: '#2B1A10', 'ink-2': '#45301F', muted: '#6E5641', line: '#E2D3BC', 'line-2': '#EFE5D6', 'line-strong': '#CDB89A',
      navy: '#5B3A22', 'navy-ink': '#4A2F1B', 'on-primary': '#FFFFFF', 'selected-ink': '#4A2F1B', tint: '#EADCC6',
      blue: '#3E6B2C', 'blue-ink': '#2F5421', warn: '#9A3412', 'warn-bg': '#FBE5D6', orange: '#C9822B',
      'brand-bg': '#3B2416', 'brand-ink': '#FFF4E3', 'brand-sub': '#D9C2A2', 'brand-hover': 'rgba(255, 244, 227, .12)',
      'inverse-bg': '#2B1A10', 'inverse-ink': '#FFF4E3', 'inverse-muted': '#D9C2A2', 'inverse-line': 'rgba(255, 244, 227, .25)',
      selection: '#E6CFA8', 'shadow-rgb': '59 36 22' } },

    { id: 'retro95', label: 'Retro 95', dark: false, font: RETRO, radius: '0px', radiusSm: '0px', tokens: {
      bg: '#C0C0C0', surface: '#DFDFDF', 'surface-2': '#D4D0C8', 'surface-3': '#C8C8C8',
      ink: '#000000', 'ink-2': '#1A1A1A', muted: '#3A3A3A', line: '#808080', 'line-2': '#A0A0A0', 'line-strong': '#404040',
      navy: '#000080', 'navy-ink': '#000066', 'on-primary': '#FFFFFF', 'selected-ink': '#FFFFFF', tint: '#000080',
      blue: '#000080', 'blue-ink': '#000066', warn: '#800000', 'warn-bg': '#FFFFE1', orange: '#808000',
      'brand-bg': '#000080', 'brand-ink': '#FFFFFF', 'brand-sub': '#C0C0C0', 'brand-hover': 'rgba(255, 255, 255, .16)',
      'inverse-bg': '#000000', 'inverse-ink': '#FFFFFF', 'inverse-muted': '#C0C0C0', 'inverse-line': 'rgba(255, 255, 255, .3)',
      selection: '#000080', 'shadow-rgb': '0 0 0' } },

    { id: 'broadsheet', label: 'Broadsheet', dark: false, font: SERIF, radius: '2px', radiusSm: '2px', tokens: {
      bg: '#F2EFE6', surface: '#FBF9F3', 'surface-2': '#F0ECE1', 'surface-3': '#E7E2D4',
      ink: '#111111', 'ink-2': '#2A2A2A', muted: '#555049', line: '#CFC8B6', 'line-2': '#E6E1D3', 'line-strong': '#111111',
      navy: '#111111', 'navy-ink': '#000000', 'on-primary': '#FBF9F3', 'selected-ink': '#7A1212', tint: '#EFE3D3',
      blue: '#7A1212', 'blue-ink': '#5E0E0E', warn: '#7A1212', 'warn-bg': '#F3E1DA', orange: '#A0522D',
      'brand-bg': '#111111', 'brand-ink': '#FBF9F3', 'brand-sub': '#CFC8B6', 'brand-hover': 'rgba(251, 249, 243, .12)',
      'inverse-bg': '#111111', 'inverse-ink': '#FBF9F3', 'inverse-muted': '#CFC8B6', 'inverse-line': 'rgba(251, 249, 243, .25)',
      selection: '#E8DCC0', 'shadow-rgb': '17 17 17' } },

    { id: 'matcha', label: 'Matcha', dark: false, font: ROUNDED, radius: '12px', radiusSm: '8px', tokens: {
      bg: '#F1F4EA', surface: '#FCFDF8', 'surface-2': '#EEF2E3', 'surface-3': '#E3EAD2',
      ink: '#1F2A17', 'ink-2': '#33412A', muted: '#5A6650', line: '#D6DEC4', 'line-2': '#E8EDDC', 'line-strong': '#BCC8A3',
      navy: '#4A6B2A', 'navy-ink': '#3B5621', 'on-primary': '#FFFFFF', 'selected-ink': '#33491C', tint: '#DDE8C8',
      blue: '#3F6B2E', 'blue-ink': '#2F5222', warn: '#8A4B0F', 'warn-bg': '#F6E7D2', orange: '#C08A3E',
      'brand-bg': '#3B5621', 'brand-ink': '#FCFDF8', 'brand-sub': '#CFE0B4', 'brand-hover': 'rgba(252, 253, 248, .14)',
      'inverse-bg': '#1F2A17', 'inverse-ink': '#FCFDF8', 'inverse-muted': '#CFE0B4', 'inverse-line': 'rgba(252, 253, 248, .25)',
      selection: '#D3E4B5', 'shadow-rgb': '31 42 23' } },

    { id: 'vaporwave', label: 'Vaporwave', dark: true, radius: '12px', radiusSm: '8px', tokens: dark({
      bg: '#1B1033', surface: '#241544', 'surface-2': '#2C1A52', 'surface-3': '#341F5E',
      ink: '#FDEBFF', 'ink-2': '#E9CCF5', muted: '#C3A3DB', line: '#3E2768', 'line-2': '#2F1C56', 'line-strong': '#55358A',
      navy: '#FF71CE', 'navy-ink': '#FF93DA', 'on-primary': '#1B1033', 'selected-ink': '#01CDFE', tint: '#33205C',
      blue: '#05FFA1', 'blue-ink': '#7DFFCB', warn: '#FFB86B', 'warn-bg': '#3D2340', orange: '#FFFB96',
      'brand-bg': '#120A24', 'brand-ink': '#FDEBFF', 'brand-sub': '#C3A3DB', 'brand-hover': 'rgba(255, 113, 206, .14)',
      'inverse-bg': '#FDEBFF', 'inverse-ink': '#1B1033', 'inverse-muted': '#55358A', 'inverse-line': 'rgba(27, 16, 51, .25)',
      selection: '#6B2C7A' }) },

    { id: 'contrast', label: 'High contrast', dark: false, radius: '4px', radiusSm: '4px', tokens: {
      bg: '#FFFFFF', surface: '#FFFFFF', 'surface-2': '#F2F2F2', 'surface-3': '#E6E6E6',
      ink: '#000000', 'ink-2': '#000000', muted: '#333333', line: '#000000', 'line-2': '#595959', 'line-strong': '#000000',
      navy: '#000000', 'navy-ink': '#000000', 'on-primary': '#FFFFFF', 'selected-ink': '#000000', tint: '#FFE600',
      blue: '#0000CC', 'blue-ink': '#000099', warn: '#9E0000', 'warn-bg': '#FFFFFF', orange: '#C2410C',
      'brand-bg': '#000000', 'brand-ink': '#FFFFFF', 'brand-sub': '#FFFFFF', 'brand-hover': 'rgba(255, 255, 255, .2)',
      'inverse-bg': '#000000', 'inverse-ink': '#FFFFFF', 'inverse-muted': '#FFFFFF', 'inverse-line': 'rgba(255, 255, 255, .5)',
      selection: '#FFE600', 'shadow-rgb': '0 0 0' } }
  ];

  const byId = Object.fromEntries(THEMES.map((t) => [t.id, t]));
  const DEFAULT = 'campus';

  // A font choice that works with any theme. 'theme' keeps the theme's own font.
  const FONTS = [
    { id: 'theme', label: 'Theme default' },
    { id: 'system', label: 'System', stack: SANS },
    { id: 'rounded', label: 'Rounded', stack: ROUNDED },
    { id: 'mono', label: 'Mono', stack: MONO },
    { id: 'serif', label: 'Serif', stack: SERIF },
    { id: 'comic', label: 'Comic', stack: COMIC },
    { id: 'readable', label: 'Atkinson Hyperlegible', stack: READABLE }
  ];
  const fontById = Object.fromEntries(FONTS.map((f) => [f.id, f]));
  const fontOf = (id) => (fontById[id] && fontById[id].stack ? fontById[id] : null);

  // [data-edr-theme] lifts it above every theme rule, whichever stylesheet comes last
  // (boot.js's cached rule is appended after the full sheet).
  const fontRule = (f) => 'html[data-edr-on][data-edr-theme][data-edr-font="' + f.id + '"] { --edr-font: ' + f.stack + '; }';

  function rule(t) {
    const decl = TOKENS.map((k) => '--edr-' + k + ': ' + t.tokens[k] + ';');
    if (t.font) decl.push('--edr-font: ' + t.font + ';');
    decl.push('--edr-radius: ' + (t.radius || '8px') + ';', '--edr-radius-sm: ' + (t.radiusSm || '6px') + ';');
    decl.push('color-scheme: ' + (t.dark ? 'dark' : 'light') + ';');
    return 'html[data-edr-on][data-edr-theme="' + t.id + '"] { ' + decl.join(' ') + ' }';
  }

  // One stylesheet for all themes, keyed by html[data-edr-theme].
  function css() {
    return THEMES.map(rule).concat(FONTS.filter((f) => f.stack).map(fontRule)).join('\n');
  }

  // Just one theme's rule (and font's), cached for the next page's first paint (boot.js).
  const cssFor = (id, font) => [rule(byId[id] || byId[DEFAULT])].concat(fontOf(font) ? fontRule(fontOf(font)) : []).join('\n');

  function apply(id) {
    const theme = byId[id] || byId[DEFAULT];
    if (typeof document === 'undefined') return theme;
    if (!document.getElementById('edr-theme-style')) {
      const style = document.createElement('style');
      style.id = 'edr-theme-style';
      style.textContent = css();
      (document.head || document.documentElement).append(style);
    }
    document.documentElement.setAttribute('data-edr-theme', theme.id);
    EDR.flag('dark', theme.dark);
    return theme;
  }

  function applyFont(id) {
    if (typeof document === 'undefined') return;
    if (fontOf(id)) document.documentElement.setAttribute('data-edr-font', id);
    else document.documentElement.removeAttribute('data-edr-font');
  }

  function next(id, step) {
    const i = THEMES.findIndex((t) => t.id === id);
    return THEMES[(i + (step || 1) + THEMES.length) % THEMES.length].id;
  }

  EDR.themes = { THEMES, TOKENS, FONTS, byId, fontOf, DEFAULT, css, cssFor, apply, applyFont, next };
})();
