// Run with: node --test tests/milestone-3.test.cjs
// Native components are represented as element trees. Device layout, focus and gestures
// still require Expo Go; the state queue mock deliberately batches updates until render.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');
const { connection, load: loadDatabase } = require('./sqlite-helper.cjs');
const { migrateDatabase } = loadDatabase('src/services/database/migrations');
const { GameRepository } = loadDatabase('src/services/database/game-repository');
const db = connection();
const repository = migrateDatabase(db).then(() => new GameRepository(db));
global.__DEV__ = false;
const pendingActions = [];
const flush = () => Promise.all(pendingActions.splice(0));
function track(value) { pendingActions.push(value); return value; }


const root = path.resolve(__dirname, '..');
const cache = new Map();
let frame;
let context;
let theme;
let settings = { appearance: 'system', allowNegativeScores: false };
let systemScheme = 'light';
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
  useEffect() {},
  useContext() { return context; },
};
const native = {
  StyleSheet: { create: (styles) => styles },
  Platform: { OS: 'ios', select: (options) => options.ios ?? options.default },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  Keyboard: { dismiss() {} },
  AccessibilityInfo: { announceForAccessibility() {} },
  useColorScheme: () => systemScheme,
};
for (const name of ['View', 'Text', 'Pressable', 'ScrollView', 'FlatList', 'TextInput', 'KeyboardAvoidingView', 'Modal', 'Switch']) native[name] = name;

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
    if (name === '@/services/database/database') return { getGameRepository: () => repository };
    if (name === 'react') return reactMock;
    if (name === 'expo-symbols') return { SymbolView: 'SymbolView' };
    if (name === 'expo-font') return { useFonts: () => [true, null] };
    if (name === 'expo-image') return { Image: 'Image' };
    if (/\.(ttf|svg)$/.test(name)) return name;
    if (name === 'react-native') return native;
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
    if (name === 'expo-router') return { Stack: { Screen: 'StackScreen' }, useFocusEffect() {}, useLocalSearchParams: () => ({}), useRouter: () => ({ navigate: (route) => navigation.push(route), push: (route) => navigation.push(route), replace: (route) => navigation.push(route) }) };
    if (name === 'expo-router/react-navigation') return { useHeaderHeight: () => 64 };
    if (name === '@/hooks/use-theme') return { useTheme: () => theme };
    if (name === '@/context/settings-context') return { useSettings: () => settings };
    if (name === '@expo/ui/swift-ui') return { ColorPicker: 'NativeColorPicker', Host: 'Host' };
    if (name === '@expo/ui/swift-ui/modifiers') return Object.fromEntries(['accessibilityLabel', 'frame', 'labelsHidden', 'scaleEffect'].map((key) => [key, (value) => ({ key, value })]));
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
const { CustomColorPicker } = load('src/components/custom-color-picker');
const { CustomColorPicker: AppleColorPicker } = load('src/components/custom-color-picker.ios.tsx');
const { default: Scoreboard } = load('src/app/scoreboard');
const { default: NewGame } = load('src/app/new-game');
const { getGridColumns } = load('src/utils/scoreboard-layout');
const { getPlayerColor, normalizePlayerColor, PLAYER_COLORS } = load('src/constants/player-colors');
const { Colors } = load('src/constants/theme');
const fixture = (count) => ({ id: 'game', players: Array.from({ length: count }, (_, index) => ({
  id: `p${index}`, name: `Player ${index + 1}`, color: '#1D4ED8', score: 0, displayOrder: index,
})) });

for (const count of [1, 4, 16]) {
  test(`${count} players: batched scores, isolated players, both layouts and themes`, async () => {
    const renderProvider = mount(GameProvider);
    context = renderProvider().props.value;
    await context.createGame(fixture(count));
    context = renderProvider().props.value;
    const playerId = context.game.players[0].id;
    const changeScore = (...args) => track(context.changeScore(...args));
    // All these presses happen before another render (the stale-state regression).
    for (let index = 0; index < 100; index++) changeScore(playerId, 1);
    changeScore(playerId, 5);
    changeScore(playerId, 5);
    changeScore(playerId, 10);
    await flush();
    context = renderProvider().props.value;
    assert.equal(context.game.players[0].score, 120);
    assert.ok(context.game.players.slice(1).every((player) => player.score === 0));
    for (const scheme of ['light', 'dark']) {
      theme = Colors[scheme];
      const renderScreen = mount(Scoreboard);
      nodes(renderScreen()).find((node) => node.props?.onLayout).props.onLayout({ nativeEvent: { layout: { width: 358 } } });
      for (const mode of ['list', 'grid', 'list', 'grid']) {
        await button(renderScreen(), mode === 'grid' ? 'Grid view' : 'List view').onPress();
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
    let opened;
    const card = PlayerCard({ player: context.game.players[0], layout: 'grid', onPress: (player) => { opened = player; } });
    assert.equal(nodes(card).filter((node) => node.type === 'Pressable').length, 1);
    button(card, 'Player 1, score 120').onPress();
    assert.equal(opened.id, playerId);
    assert.equal(context.game.players[0].score, 120);

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

test('optional names, pinned Add Player, 1–16 guards and default names after removal', async () => {
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
  await button(render(), 'Start Game').onPress();
  context = renderProvider().props.value;
  assert.equal(context.game.players[0].name, 'Player 1');
  assert.equal(context.game.players[0].score, 0);
  assert.equal(navigation.at(-1).pathname, '/scoreboard');
});

test('grid adapts to count, phone/tablet width and larger text', () => {
  assert.equal(getGridColumns(358, 1, 1), 1);
  assert.equal(getGridColumns(358, 4, 1), 2);
  assert.equal(getGridColumns(358, 16, 1), 2);
  assert.equal(getGridColumns(1000, 16, 1), 4);
  assert.equal(getGridColumns(358, 16, 2), 1);
  assert.equal(getGridColumns(0, 16, 1), 1);
});

test('custom circle uses a visual palette on Android/web and Apple ColorPicker on iOS', () => {
  theme = Colors.dark;
  const changes = [];
  const render = mount(CustomColorPicker, { color: '#1D4ED8', playerLabel: 'Player 1', onChange: (color) => changes.push(color) });
  let tree = render();
  button(tree, 'Choose custom color for Player 1').onPress();
  tree = render();
  button(tree, 'Color #0055AA').onPress();
  assert.deepEqual(changes, ['#0055AA']);
  assert.ok(!nodes(render()).some((node) => node.type === 'TextInput'));
  button(render(), 'Choose custom color for Player 1').onPress();
  button(render(), 'Cancel color selection').onPress();
  assert.deepEqual(changes, ['#0055AA']);
  const apple = mount(AppleColorPicker, { color: '#0055AA', playerLabel: 'Player 1', onChange: (color) => changes.push(color) })();
  const picker = nodes(apple).find((node) => node.type === 'NativeColorPicker');
  assert.equal(picker.props.supportsOpacity, false);
  picker.props.onSelectionChange('#112233');
  assert.equal(changes.at(-1), '#112233');
  assert.ok(!nodes(apple).some((node) => node.type === 'TextInput'));
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

const { parseScoreInput, MAX_SCORE } = load('src/services/scoring');
const { ScoreEntryModal } = load('src/components/score-entry-modal');
const { SettingsProvider } = load('src/context/settings-context');
const { useAppColorScheme } = load('src/hooks/use-app-color-scheme');

test('switching games rejects stale handlers and ignores older load results', async () => {
  const render = mount(GameProvider);
  let value = render().props.value;
  const first = await value.createGame(fixture(1));
  value = render().props.value;
  const staleChange = value.changeScore;
  const playerId = value.game.players[0].id;
  const second = await value.createGame(fixture(1));
  value = render().props.value;
  assert.equal(await staleChange(playerId, 20), false);
  await Promise.all([value.openGame(first), value.openGame(second), value.openGame(first)]);
  value = render().props.value;
  assert.equal(value.game.id, first);
  assert.equal(value.game.players[0].score, 0);
  assert.equal(value.loadingGame, false);
});

test('Milestone 4 scoring examples and bounds', () => {
  let game = fixture(1);
  const score = (current, amount, method = 'manual', negative = false) => {
    game = { ...game, players: [{ ...game.players[0], score: current }] };
    return applyScoreChange(game, 'p0', amount, method, negative).players[0].score;
  };
  assert.equal(score(0, 1, 'preset'), 1);
  assert.equal(score(100, 20, 'preset'), 120);
  assert.equal(score(100, 35), 135);
  assert.equal(score(135, 95, 'set'), 95);
  assert.equal(score(5, -10), 0);
  assert.equal(score(5, -10, 'manual', true), -5);
  assert.equal(score(0, -50, 'set', true), -50);
  assert.equal(score(100, 0), 100);
  assert.equal(score(100, 0, 'set'), 0);
  assert.equal(score(MAX_SCORE, 1), MAX_SCORE);
  assert.equal(score(-MAX_SCORE, -1, 'manual', true), -MAX_SCORE);
  assert.equal(score(0, MAX_SCORE + 1, 'set'), 0);
});

test('manual input validation rejects blank, text, decimals, huge and disabled negative values', () => {
  for (const value of ['', '  ', 'word', '1.5', '1e3', '12px', '1,000', '99999999999999999999']) {
    assert.ok(parseScoreInput(value, 'manual', false).error, value);
  }
  assert.equal(parseScoreInput('-10', 'manual', false).value, -10);
  assert.ok(parseScoreInput('-10', 'set', false).error.includes('Settings'));
  assert.equal(parseScoreInput('-10', 'manual', true).value, -10);
  assert.equal(parseScoreInput('0', 'manual', false).value, 0);
  assert.equal(parseScoreInput(' 35 ', 'manual', false).value, 35);
});

test('pending scoring: rapid presets, custom, Set, validation and one confirmed database action', async () => {
  settings = { appearance: 'system', allowNegativeScores: false };
  theme = Colors.light;
  const provider = mount(GameProvider);
  context = provider().props.value;
  await context.createGame(fixture(1));
  context = provider().props.value;
  const id = context.game.id, playerId = context.game.players[0].id;
  await context.changeScore(playerId, 3, 'set');
  context = provider().props.value;
  const player = context.game.players[0];
  let closes = 0;
  const render = mount(ScoreEntryModal, { player, onSubmit: context.changeScore, onClose: () => closes++ });
  const plus = button(render(), 'Add 1 pending points');
  plus.onPress(); plus.onPress();
  button(render(), 'Add 10 pending points').onPress();
  assert.ok(nodes(render()).some((node) => node.props?.children === '3 + 12 = 15'));
  const repo = await repository;
  assert.equal((await repo.loadGame(id)).game.players[0].score, 3);
  assert.equal((await repo.loadGame(id)).events.length, 1);
  const confirm = button(render(), 'Confirm score change');
  const first = confirm.onPress();
  await confirm.onPress();
  await first;
  assert.equal(closes, 1);
  assert.equal((await repo.loadGame(id)).game.players[0].score, 15);
  assert.equal((await repo.loadGame(id)).events.length, 2);

  const calls = [];
  const props = { player: { ...player, score: 20 }, onSubmit: async (...args) => { calls.push(args); return true; }, onClose: () => closes++ };
  for (const [deltas, preview, expected] of [[[-5, -1], '20 - 6 = 14', -6], [[10, -1, -1], '20 + 8 = 28', 8]]) {
    const modal = mount(ScoreEntryModal, props);
    for (const delta of deltas) button(modal(), `${delta > 0 ? 'Add' : 'Subtract'} ${Math.abs(delta)} pending points`).onPress();
    assert.ok(nodes(modal()).some((node) => node.props?.children === preview));
    await button(modal(), 'Confirm score change').onPress();
    assert.deepEqual(calls.at(-1), [playerId, expected, 'manual', 20]);
  }
  const custom = mount(ScoreEntryModal, props);
  button(custom(), 'Custom Score Change').onPress();
  nodes(custom()).find((node) => node.type === 'TextInput').props.onChangeText('12');
  assert.ok(nodes(custom()).some((node) => node.props?.children === '20 + 12 = 32'));
  button(custom(), 'Cancel score entry').onPress();
  assert.equal(calls.length, 2);
  const back = mount(ScoreEntryModal, props);
  button(back(), 'Add 10 pending points').onPress();
  back().props.onRequestClose();
  assert.equal(calls.length, 2);
  const set = mount(ScoreEntryModal, props);
  button(set(), 'Set Score').onPress();
  nodes(set()).find((node) => node.type === 'TextInput').props.onChangeText('125');
  assert.equal(calls.length, 2);
  await button(set(), 'Confirm score change').onPress();
  assert.deepEqual(calls.at(-1), [playerId, 125, 'set', 20]);
  const invalid = mount(ScoreEntryModal, props);
  button(invalid(), 'Custom Score Change').onPress();
  for (const input of ['', '1.5', '1000000000']) {
    nodes(invalid()).find((node) => node.type === 'TextInput').props.onChangeText(input);
    assert.equal(button(invalid(), 'Confirm score change').disabled, true);
    await button(invalid(), 'Confirm score change').onPress();
  }
  assert.equal(calls.length, 3);
});

test('scoreboard keeps the same toolbar structure and card keys while saving', async () => {
  theme = Colors.light;
  const provider = mount(GameProvider);
  context = provider().props.value;
  await context.createGame(fixture(4));
  context = provider().props.value;
  const render = mount(Scoreboard);
  const tree = render();
  context = { ...context, saving: true };
  const savingTree = render();
  assert.deepEqual(nodes(savingTree).map((node) => node.type), nodes(tree).map((node) => node.type));
  assert.deepEqual(nodes(savingTree).map((node) => node.key), nodes(tree).map((node) => node.key));
});

test('session appearance, negative toggle, and provider integration', async () => {
  const renderSettings = mount(SettingsProvider);
  settings = renderSettings().props.value;
  assert.equal(settings.appearance, 'system');
  assert.equal(settings.allowNegativeScores, false);
  systemScheme = 'dark';
  assert.equal(useAppColorScheme(), 'dark');
  settings.setAppearance('light');
  settings = renderSettings().props.value;
  assert.equal(useAppColorScheme(), 'light');
  settings.setAppearance('dark');
  settings = renderSettings().props.value;
  systemScheme = 'light';
  assert.equal(useAppColorScheme(), 'dark');
  const provider = mount(GameProvider);
  context = provider().props.value;
  await context.createGame(fixture(1));
  context = provider().props.value;
  const playerId = context.game.players[0].id;
  await context.changeScore(playerId, 5, 'manual');
  await context.changeScore(playerId, -10, 'manual');
  context = provider().props.value;
  assert.equal(context.game.players[0].score, 0);
  settings.setAllowNegativeScores(true);
  settings = renderSettings().props.value;
  context = provider().props.value;
  await context.changeScore(playerId, -50, 'manual');
  context = provider().props.value;
  assert.equal(context.game.players[0].score, -50);
  await context.changeScore(playerId, MAX_SCORE, 'set');
  await context.changeScore(playerId, 1, 'preset');
  context = provider().props.value;
  assert.equal(context.game.players[0].score, MAX_SCORE);
  assert.ok(context.scoreError);
  settings = { appearance: 'system', allowNegativeScores: false };
});
const { ConfirmActionModal } = load('src/components/confirm-action-modal');
const { UndoRedoControls } = load('src/components/undo-redo-controls');
const { default: HomeScreen } = load('src/app/index');
const { default: GamesScreen } = load('src/app/games');
const { default: HistoryScreen } = load('src/app/history');

test('confirmation Cancel/back never invokes destructive actions; duplicate confirm and failure are handled', async () => {
  theme = Colors.light;
  for (const actionLabel of ['Delete', 'Restore']) {
    let calls = 0, closes = 0, finish;
    const render = mount(ConfirmActionModal, {
      title: 'Confirm?', description: 'Test', actionLabel,
      onConfirm: () => { calls++; return new Promise((resolve) => { finish = resolve; }); },
      onClose: () => closes++,
    });
    button(render(), 'Cancel').onPress();
    render().props.onRequestClose();
    assert.equal(calls, 0);
    assert.equal(closes, 2);
    const action = button(render(), actionLabel);
    const pending = action.onPress();
    await action.onPress();
    button(render(), 'Cancel').onPress();
    assert.equal(calls, 1);
    assert.equal(closes, 2);
    finish(false);
    await pending;
    assert.equal(closes, 2);
    const retry = button(render(), actionLabel).onPress();
    finish(true);
    await retry;
    assert.equal(closes, 3);
  }
});

test('Home routes to Saved Games; selecting Delete or Restore waits for confirmation', async () => {
  theme = Colors.light;
  const provider = mount(GameProvider);
  context = provider().props.value;
  await context.createGame(fixture(2));
  context = provider().props.value;
  const id = context.game.id, player = context.game.players[0].id;
  await context.changeScore(player, 5, 'manual');
  context = provider().props.value;
  const target = context.events[0].id;
  await context.changeScore(player, 10, 'manual');
  await context.refreshGames();
  context = provider().props.value;
  const home = mount(HomeScreen)();
  button(home, 'Continue Game').onPress();
  assert.equal(navigation.at(-1), '/games');
  assert.ok(!nodes(home).some((node) => node.type === 'FlatList'));
  const history = mount(HistoryScreen);
  const list = nodes(history()).find((node) => node.type === 'FlatList');
  const row = list.props.renderItem({ item: list.props.data.find((group) => group[0].id === target) });
  button(row, `Restore scores after action #${target}`).onPress();
  let confirm = nodes(history()).find((node) => node.type === ConfirmActionModal);
  const repo = await repository;
  assert.equal((await repo.loadGame(id)).game.players[0].score, 15);
  confirm.props.onClose();
  assert.equal((await repo.loadGame(id)).game.players[0].score, 15);
  button(row, `Restore scores after action #${target}`).onPress();
  confirm = nodes(history()).find((node) => node.type === ConfirmActionModal);
  await confirm.props.onConfirm();
  context = provider().props.value;
  assert.equal(context.game.players[0].score, 5);
  const games = mount(GamesScreen);
  const gamesList = nodes(games()).find((node) => node.type === 'FlatList');
  const gameRow = gamesList.props.renderItem({ item: context.activeGames.find((game) => game.id === id) });
  button(gameRow, 'Delete Untitled game').onPress();
  confirm = nodes(games()).find((node) => node.type === ConfirmActionModal);
  assert.ok(await repo.loadGame(id));
  confirm.props.onClose();
  assert.ok(await repo.loadGame(id));
  button(gameRow, 'Delete Untitled game').onPress();
  confirm = nodes(games()).find((node) => node.type === ConfirmActionModal);
  await confirm.props.onConfirm();
  context = provider().props.value;
  assert.equal(context.game, null);
  assert.equal(context.activeGames.some((game) => game.id === id), false);
  await assert.rejects(repo.loadGame(id));
});

test('Undo and Redo icons have explicit labels and correct disabled states', () => {
  theme = Colors.dark;
  const tree = UndoRedoControls({ canUndo: true, canRedo: false, busy: false, undo: async () => true, redo: async () => true });
  assert.equal(button(tree, 'Undo last score change').disabled, false);
  assert.equal(button(tree, 'Redo last undone score change').disabled, true);
});
