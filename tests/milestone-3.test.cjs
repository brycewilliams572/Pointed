// Run with: node --test tests/milestone-3.test.cjs
// Native components are represented as element trees. Device layout, focus and gestures
// still require Expo Go; the state queue mock deliberately batches updates until render.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');

const root = path.resolve(__dirname, '..');
const cache = new Map();
let frame;
let context;
let theme;
const navigation = [];
const reactMock = {
  ...React,
  useState(initial) {
    const index = frame.cursor++;
    const owner = frame;
    if (!owner.slots[index]) owner.slots[index] = { value: typeof initial === 'function' ? initial() : initial, queue: [] };
    const slot = owner.slots[index];
    for (const update of slot.queue) slot.value = typeof update === 'function' ? update(slot.value) : update;
    slot.queue = [];
    return [slot.value, (update) => slot.queue.push(update)];
  },
  useRef(initial) { return reactMock.useState(() => ({ current: initial }))[0]; },
  useCallback(fn) { return fn; },
  useContext() { return context; },
};
const native = {
  StyleSheet: { create: (styles) => styles },
  Platform: { OS: 'ios', select: (options) => options.ios ?? options.default },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  Keyboard: { dismiss() {} },
};
for (const name of ['View', 'Text', 'Pressable', 'ScrollView', 'TextInput', 'KeyboardAvoidingView']) native[name] = name;

function load(relative) {
  let file = path.resolve(root, relative);
  if (!path.extname(file)) file += fs.existsSync(file + '.tsx') ? '.tsx' : '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const localRequire = (name) => {
    if (name === 'react') return reactMock;
    if (name === 'react-native') return native;
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === 'expo-router') return { useRouter: () => ({ push: (route) => navigation.push(route), replace() {} }) };
    if (name === 'expo-router/react-navigation') return { useHeaderHeight: () => 64 };
    if (name === '@/hooks/use-theme') return { useTheme: () => theme };
    if (name.endsWith('.css')) return {};
    if (name.startsWith('@/')) return load('src/' + name.slice(2));
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
    return require(name);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
  return module.exports;
}

function mount(Component, props = {}) {
  const state = { cursor: 0, slots: [] };
  return () => { frame = state; frame.cursor = 0; return Component(props); };
}
function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap(nodes);
  return [element, ...nodes(element.props?.children)];
}
function button(tree, label) {
  const found = nodes(tree).find((node) => node.type === 'Pressable' && node.props.accessibilityLabel === label);
  assert.ok(found, label);
  return found.props;
}
const { applyScoreChange } = load('src/services/scoring');
const { GameProvider } = load('src/context/game-context');
const { PlayerCard } = load('src/components/player-card');
const { PlayerColorPicker } = load('src/components/player-color-picker');
const { default: Scoreboard } = load('src/app/scoreboard');
const { default: NewGame } = load('src/app/new-game');
const { getGridColumns } = load('src/utils/scoreboard-layout');
const { getPlayerColor, normalizePlayerColor, PLAYER_COLORS } = load('src/constants/player-colors');
const { Colors } = load('src/constants/theme');
const fixture = (count) => ({ id: 'game', players: Array.from({ length: count }, (_, index) => ({
  id: `p${index}`, name: `Player ${index + 1}`, color: '#1D4ED8', score: 0, displayOrder: index,
})) });

for (const count of [1, 4, 16]) {
  test(`${count} players: batched scores, isolated players, both layouts and themes`, () => {
    const renderProvider = mount(GameProvider);
    context = renderProvider().props.value;
    context.setGame(fixture(count));
    context = renderProvider().props.value;
    const changeScore = context.changeScore;
    // All these presses happen before another render (the stale-state regression).
    for (let index = 0; index < 100; index++) changeScore('p0', 1);
    changeScore('p0', 5);
    changeScore('p0', 5);
    changeScore('p0', 10);
    context = renderProvider().props.value;
    assert.equal(context.game.players[0].score, 120);
    assert.ok(context.game.players.slice(1).every((player) => player.score === 0));
    for (const scheme of ['light', 'dark']) {
      theme = Colors[scheme];
      const renderScreen = mount(Scoreboard);
      nodes(renderScreen()).find((node) => node.props?.onLayout).props.onLayout({ nativeEvent: { layout: { width: 358 } } });
      for (const mode of ['list', 'grid', 'list', 'grid']) {
        button(renderScreen(), mode === 'grid' ? 'Grid view' : 'List view').onPress();
        context = renderProvider().props.value;
        const tree = renderScreen();
        const cards = nodes(tree).filter((node) => node.type === PlayerCard);
        assert.equal(cards.length, count);
        assert.ok(cards.every((card) => card.props.layout === mode));
        assert.equal(context.game.players[0].score, 120);
        assert.equal(button(tree, mode === 'grid' ? 'Grid view' : 'List view').accessibilityState.selected, true);
        const remounted = mount(Scoreboard)();
        assert.equal(button(remounted, mode === 'grid' ? 'Grid view' : 'List view').accessibilityState.selected, true);
      }
    }
    const card = PlayerCard({ player: context.game.players[0], layout: 'grid', onScoreChange: changeScore });
    for (const amount of [1, 5, 10, 20]) {
      button(card, `Add ${amount} ${amount === 1 ? 'point' : 'points'} to Player 1`).onPress();
    }
    context = renderProvider().props.value;
    assert.equal(context.game.players[0].score, 156);
  });
}

test('score transition is immutable and rejects invalid increments or players', () => {
  const game = fixture(4);
  const changed = [5, 5, 10].reduce((state, amount) => applyScoreChange(state, 'p0', amount), game);
  assert.equal(changed.players[0].score, 20);
  assert.equal(game.players[0].score, 0);
  for (const amount of [-1, 0, NaN, Infinity, 1.5]) assert.equal(applyScoreChange(game, 'p0', amount), game);
  assert.equal(applyScoreChange(game, 'missing', 1), game);
  assert.equal(applyScoreChange(null, 'p0', 1), null);
});

test('optional names, pinned Add Player, 1–16 guards and default names after removal', () => {
  theme = Colors.light;
  const renderProvider = mount(GameProvider);
  context = renderProvider().props.value;
  const render = mount(NewGame);
  let tree = render();
  const scroll = nodes(tree).find((node) => node.type === 'ScrollView');
  assert.ok(!nodes(scroll).some((node) => node.props?.accessibilityLabel === 'Add Player'));
  const add = button(tree, 'Add Player').onPress;
  for (let index = 0; index < 30; index++) add();
  tree = render();
  let editors = nodes(tree).filter((node) => node.props?.onRemove);
  assert.equal(editors.length, 16);
  assert.equal(button(tree, 'Add Player').disabled, true);
  for (const editor of editors) editor.props.onRemove();
  tree = render();
  editors = nodes(tree).filter((node) => node.props?.onRemove);
  assert.equal(editors.length, 1);
  assert.equal(editors[0].props.canRemove, false);
  editors[0].props.onChange({ name: '   ' });
  button(render(), 'Start Game').onPress();
  context = renderProvider().props.value;
  assert.equal(context.game.players[0].name, 'Player 1');
  assert.equal(context.game.players[0].score, 0);
  assert.equal(navigation.at(-1), '/scoreboard');
});

test('grid adapts to count, phone/tablet width and larger text', () => {
  assert.equal(getGridColumns(358, 1, 1), 1);
  assert.equal(getGridColumns(358, 4, 1), 2);
  assert.equal(getGridColumns(358, 16, 1), 2);
  assert.equal(getGridColumns(1000, 16, 1), 4);
  assert.equal(getGridColumns(358, 16, 2), 1);
  assert.equal(getGridColumns(0, 16, 1), 1);
});

test('custom color circle opens a validated editor, applies and cancels', () => {
  theme = Colors.dark;
  const changes = [];
  const render = mount(PlayerColorPicker, { color: '#1D4ED8', playerLabel: 'Player 1', onChange: (color) => changes.push(color) });
  let tree = render();
  assert.equal(nodes(tree).filter((node) => node.type === 'Pressable').length, 10);
  button(tree, 'Choose custom color for Player 1').onPress();
  tree = render();
  nodes(tree).find((node) => node.type === 'TextInput').props.onChangeText('#nope');
  assert.equal(button(render(), 'Apply custom color to Player 1').disabled, true);
  nodes(render()).find((node) => node.type === 'TextInput').props.onChangeText('#abc');
  button(render(), 'Apply custom color to Player 1').onPress();
  assert.deepEqual(changes, ['#AABBCC']);
  assert.ok(!nodes(render()).some((node) => node.type === 'TextInput'));
  button(render(), 'Choose custom color for Player 1').onPress();
  button(render(), 'Cancel custom color').onPress();
  assert.deepEqual(changes, ['#AABBCC']);
});

test('custom hex validation and contrasting foregrounds across the RGB range', () => {
  assert.equal(normalizePlayerColor(' #aBc '), '#AABBCC');
  assert.equal(normalizePlayerColor('3366ff'), '#3366FF');
  for (const value of ['', '#12', '#GGGGGG', '#12345678']) assert.equal(normalizePlayerColor(value), null);
  const luminance = (hex) => {
    const rgb = hex.slice(1).match(/../g).map((v) => parseInt(v, 16) / 255)
      .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const colors = PLAYER_COLORS.map((color) => color.background);
  for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) {
    colors.push('#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''));
  }
  for (const hex of colors) {
    const color = getPlayerColor(hex);
    const values = [luminance(color.background), luminance(color.foreground)].sort((a, b) => b - a);
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, hex);
  }
});
