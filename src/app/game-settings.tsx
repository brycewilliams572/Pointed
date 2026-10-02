import { useState, type ReactNode } from 'react';
import { Image, type ImageSource } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { arcadeColors, arcadeSurface, gameFonts, useGameScreenAppearance } from '@/components/game-screen-chrome';

export default function GameSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontsLoaded } = useGameScreenAppearance();
  const [edited, setEdited] = useState(false);
  const [useRounds, setUseRounds] = useState(true);
  const [continueScores, setContinueScores] = useState(true);
  const [roundCount, setRoundCount] = useState(5);
  const [pointsGood, setPointsGood] = useState(true);
  const [targetEnabled, setTargetEnabled] = useState(true);
  const [target, setTarget] = useState(50);
  const [afterRound, setAfterRound] = useState(false);
  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [confirm, setConfirm] = useState(true);
  const [allowUndo, setAllowUndo] = useState(true);
  const change = (work: () => void) => { work(); setEdited(true); };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.screen, { paddingTop: Math.max(62, insets.top) }]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
            <Image source={require('../../assets/images/figma-game/chevron-left.svg')} accessible={false} style={styles.backIcon} />
            <Text style={[styles.backText, fontsLoaded && gameFonts.display]}>Back</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.headerTitle, fontsLoaded && gameFonts.display]}>Game settings</Text>
            <Text style={[styles.headerSub, fontsLoaded && gameFonts.bold]}>HOUSE RULES</Text>
          </View>
          <View style={[styles.editedBadge, { opacity: edited ? 1 : 0 }]}>
            <Text style={[styles.editedText, fontsLoaded && gameFonts.bold]}>Edited</Text>
          </View>
        </View>
        <ScrollView alwaysBounceVertical={false} bounces={false} overScrollMode="never"
          contentContainerStyle={styles.content}>
          <View style={styles.intro}>
            <IconTile source={require('../../assets/images/figma-game/sliders.svg')} yellow />
            <View style={styles.flexCopy}>
              <Text style={[styles.introTitle, fontsLoaded && gameFonts.display]}>Tune the match</Text>
              <Text style={[styles.body, fontsLoaded && gameFonts.regular]}>These rules apply when the next game starts.</Text>
            </View>
          </View>

          <Section number="01" label="ROUNDS" title="How long should play last?"
            description="Use a set match length, or keep playing until the group decides." fontsLoaded={fontsLoaded}>
            <View style={styles.card}>
              <SettingRow title="Use rounds" description="Track scores one round at a time." fontsLoaded={fontsLoaded}
                control={<ArcadeSwitch value={useRounds} label="Use rounds" onChange={() => change(() => setUseRounds((value) => !value))} />} />
              <Divider />
              <View style={styles.segments}>
                <Segment selected={useRounds} icon={require('../../assets/images/figma-game/hash.svg')} label="Fixed rounds" fontsLoaded={fontsLoaded}
                  onPress={() => change(() => setUseRounds(true))} />
                <Segment selected={!useRounds} icon={require('../../assets/images/figma-game/infinity.svg')} label="Open ended" fontsLoaded={fontsLoaded}
                  onPress={() => change(() => setUseRounds(false))} />
              </View>
              {useRounds ? <Stepper label="ROUND COUNT" value={roundCount} suffix="rounds" fontsLoaded={fontsLoaded}
                decrease={() => change(() => setRoundCount((value) => Math.max(1, value - 1)))}
                increase={() => change(() => setRoundCount((value) => Math.min(99, value + 1)))} /> : null}
              <SettingRow title="Continue score between rounds" description="Keep the current score when the next round starts." fontsLoaded={fontsLoaded}
                control={<ArcadeSwitch value={continueScores} label="Continue score between rounds" onChange={() => change(() => setContinueScores((value) => !value))} />} />
              <View style={styles.hintRow}>
                <Image source={require('../../assets/images/figma-game/arrow-right-circle.svg')} accessible={false} style={styles.hintIcon} />
                <Text style={[styles.body, styles.hintCopy, fontsLoaded && gameFonts.regular]}>
                  Open-ended games show a “Next round” action after scoring.
                </Text>
              </View>
            </View>
          </Section>

          <Section number="02" label="POINT MEANING" title="What does a point mean?"
            description="Choose the rule that decides who is leading." fontsLoaded={fontsLoaded}>
            <Choice selected={pointsGood} icon={require('../../assets/images/figma-game/trophy.svg')}
              title="Points are good" description="Highest score wins the game." fontsLoaded={fontsLoaded}
              onPress={() => change(() => setPointsGood(true))} />
            <Choice selected={!pointsGood} icon={require('../../assets/images/figma-game/arrow-down.svg')}
              title="Points are bad" description="Lowest score wins — great for penalty games." fontsLoaded={fontsLoaded}
              onPress={() => change(() => setPointsGood(false))} />
          </Section>

          <Section number="03" label="GAME END" title="Set a finish line"
            description="Optionally stop the game when a player reaches a target." fontsLoaded={fontsLoaded}>
            <View style={styles.card}>
              <SettingRow title="End at target points" description="Turn off to end the game manually." fontsLoaded={fontsLoaded}
                control={<ArcadeSwitch value={targetEnabled} label="End at target points" onChange={() => change(() => setTargetEnabled((value) => !value))} />} />
              <Divider />
              {targetEnabled ? <Stepper label="TARGET SCORE" value={target} suffix="points" fontsLoaded={fontsLoaded}
                decrease={() => change(() => setTarget((value) => Math.max(1, value - 5)))}
                increase={() => change(() => setTarget((value) => Math.min(999999999, value + 5)))} /> : null}
              <Text style={[styles.miniLabel, fontsLoaded && gameFonts.bold]}>WHEN THE TARGET IS REACHED</Text>
              <View style={styles.segments}>
                <Segment selected={!afterRound} icon={require('../../assets/images/figma-game/zap.svg')} label="Immediately" fontsLoaded={fontsLoaded}
                  onPress={() => change(() => setAfterRound(false))} />
                <Segment selected={afterRound} icon={require('../../assets/images/figma-game/flag.svg')} label="After round" fontsLoaded={fontsLoaded}
                  onPress={() => change(() => setAfterRound(true))} />
              </View>
              <Text style={[styles.body, fontsLoaded && gameFonts.regular]}>
                The win is called {afterRound ? 'after the current round finishes' : `as soon as ${target} points is reached`}.
              </Text>
            </View>
          </Section>

          <Section number="06" label="FEEDBACK & SAFETY" title="Make every tap feel clear"
            description="Choose feedback and protect important actions." fontsLoaded={fontsLoaded}>
            <View style={styles.card}>
              <FeedbackRow icon={require('../../assets/images/figma-game/volume.svg')} title="Scoring sound"
                description="Play a short arcade tone when points change." value={sound} fontsLoaded={fontsLoaded}
                onChange={() => change(() => setSound((value) => !value))} />
              <Divider />
              <FeedbackRow icon={require('../../assets/images/figma-game/vibrate.svg')} title="Haptic feedback"
                description="Give score buttons a light vibration." value={haptics} fontsLoaded={fontsLoaded}
                onChange={() => change(() => setHaptics((value) => !value))} />
              <Divider />
              <FeedbackRow icon={require('../../assets/images/figma-game/shield.svg')} title="Confirm destructive actions"
                description="Ask before ending or resetting a game." value={confirm} fontsLoaded={fontsLoaded}
                onChange={() => change(() => setConfirm((value) => !value))} />
              <Divider />
              <FeedbackRow icon={require('../../assets/images/figma-game/undo.svg')} title="Allow undo"
                description="Players can reverse the last score entry." value={allowUndo} fontsLoaded={fontsLoaded}
                onChange={() => change(() => setAllowUndo((value) => !value))} />
            </View>
          </Section>

          <View style={styles.bottomActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Save settings" onPress={() => router.back()} style={styles.save}>
              <Image source={require('../../assets/images/figma-game/check.svg')} accessible={false} style={styles.saveIcon} />
              <Text style={[styles.saveText, fontsLoaded && gameFonts.bold]}>Save settings</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel changes" onPress={() => router.back()} style={styles.cancel}>
              <Text style={[styles.cancelText, fontsLoaded && gameFonts.regular]}>Cancel changes</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ number, label, title, description, children, fontsLoaded }: {
  number: string; label: string; title: string; description: string; children: ReactNode; fontsLoaded: boolean;
}) {
  return <View style={styles.section}>
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionEyebrow, fontsLoaded && gameFonts.bold]}>{number} · {label}</Text>
      <Text style={[styles.sectionTitle, fontsLoaded && gameFonts.display]}>{title}</Text>
      <Text style={[styles.sectionDescription, fontsLoaded && gameFonts.regular]}>{description}</Text>
    </View>
    {children}
  </View>;
}

function SettingRow({ title, description, control, fontsLoaded }: { title: string; description: string; control: ReactNode; fontsLoaded: boolean }) {
  return <View style={styles.settingRow}><View style={styles.flexCopy}>
    <Text style={[styles.settingTitle, fontsLoaded && gameFonts.regular]}>{title}</Text>
    <Text style={[styles.body, fontsLoaded && gameFonts.regular]}>{description}</Text>
  </View>{control}</View>;
}

function ArcadeSwitch({ value, label, onChange }: { value: boolean; label: string; onChange: () => void }) {
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }}
    onPress={onChange} style={[styles.switch, !value && styles.switchOff]}>
    <View style={[styles.switchThumb, !value && styles.switchThumbOff]} />
  </Pressable>;
}

function Segment({ selected, icon, label, onPress, fontsLoaded }: { selected: boolean; icon: ImageSource; label: string; onPress: () => void; fontsLoaded: boolean }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress}
    style={[styles.segment, selected && styles.segmentSelected]}>
    <Image source={icon} accessible={false} style={styles.segmentIcon} />
    <Text style={[styles.segmentText, selected && styles.segmentTextSelected, fontsLoaded && gameFonts.bold]}>{label}</Text>
  </Pressable>;
}

function Stepper({ label, value, suffix, decrease, increase, fontsLoaded }: {
  label: string; value: number; suffix: string; decrease: () => void; increase: () => void; fontsLoaded: boolean;
}) {
  return <View style={styles.stepper}>
    <Text style={[styles.miniLabel, fontsLoaded && gameFonts.bold]}>{label}</Text>
    <View style={styles.stepperRow}>
      <View style={styles.valueRow}><Text style={[styles.value, fontsLoaded && gameFonts.display]}>{value}</Text>
        <Text style={[styles.suffix, fontsLoaded && gameFonts.regular]}>{suffix}</Text></View>
      <View style={styles.stepperButtons}>
        <IconButton label={`Decrease ${label.toLowerCase()}`} icon={require('../../assets/images/figma-game/minus.svg')} onPress={decrease} />
        <IconButton label={`Increase ${label.toLowerCase()}`} icon={require('../../assets/images/figma-game/plus.svg')} onPress={increase} />
      </View>
    </View>
  </View>;
}

function IconButton({ label, icon, onPress }: { label: string; icon: ImageSource; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
    <Image source={icon} accessible={false} style={styles.stepperIcon} />
  </Pressable>;
}

function Choice({ selected, icon, title, description, onPress, fontsLoaded }: {
  selected: boolean; icon: ImageSource; title: string; description: string; onPress: () => void; fontsLoaded: boolean;
}) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress}
    style={[styles.choice, selected && styles.choiceSelected]}>
    <IconTile source={icon} yellow={selected} />
    <View style={styles.flexCopy}><Text style={[styles.choiceTitle, fontsLoaded && gameFonts.bold]}>{title}</Text>
      <Text style={[styles.body, fontsLoaded && gameFonts.regular]}>{description}</Text></View>
    {selected ? <Image source={require('../../assets/images/figma-game/radio.svg')} accessible={false} style={styles.radio} /> :
      <View style={styles.emptyRadio} />}
  </Pressable>;
}

function FeedbackRow({ icon, title, description, value, onChange, fontsLoaded }: {
  icon: ImageSource; title: string; description: string; value: boolean; onChange: () => void; fontsLoaded: boolean;
}) {
  return <View style={styles.feedbackRow}><IconTile source={icon} />
    <View style={styles.flexCopy}><Text style={[styles.settingTitle, fontsLoaded && gameFonts.regular]}>{title}</Text>
      <Text style={[styles.body, fontsLoaded && gameFonts.regular]}>{description}</Text></View>
    <ArcadeSwitch value={value} label={title} onChange={onChange} />
  </View>;
}

function IconTile({ source, yellow = false }: { source: ImageSource; yellow?: boolean }) {
  return <View style={[styles.iconTile, yellow && styles.iconTileYellow]}>
    <Image source={source} accessible={false} style={styles.tileIcon} />
  </View>;
}

function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: arcadeColors.navy },
  header: { width: '100%', maxWidth: 402, alignSelf: 'center', height: 60, borderBottomWidth: 4, borderColor: arcadeColors.ink, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 90, height: 44, flexDirection: 'row', gap: 6, alignItems: 'center' },
  backIcon: { width: 18, height: 18 },
  backText: { color: arcadeColors.muted, fontSize: 14, lineHeight: 18 },
  headerCopy: { position: 'absolute', left: 112, right: 112, alignItems: 'center' },
  headerTitle: { color: arcadeColors.white, fontSize: 17, lineHeight: 20 },
  headerSub: { color: arcadeColors.muted, fontSize: 10, lineHeight: 12, letterSpacing: 0.8 },
  editedBadge: { backgroundColor: '#B91C1C', borderWidth: 2, borderColor: arcadeColors.ink, paddingHorizontal: 5, paddingVertical: 2 },
  editedText: { color: arcadeColors.white, fontSize: 11, lineHeight: 13 },
  content: { width: '100%', maxWidth: 402, alignSelf: 'center', padding: 16, paddingTop: 24, paddingBottom: 20, gap: 28 },
  intro: { ...arcadeSurface, minHeight: 82, backgroundColor: arcadeColors.panel, padding: 12, gap: 12, flexDirection: 'row', alignItems: 'center' },
  iconTile: { width: 38, height: 38, backgroundColor: arcadeColors.navy, borderWidth: 3, borderColor: arcadeColors.ink, alignItems: 'center', justifyContent: 'center' },
  iconTileYellow: { width: 46, height: 46, backgroundColor: arcadeColors.yellow },
  tileIcon: { width: 21, height: 21 },
  flexCopy: { flex: 1, minWidth: 0, gap: 2 },
  introTitle: { color: arcadeColors.white, fontSize: 15, lineHeight: 19 },
  body: { color: arcadeColors.muted, fontSize: 13, lineHeight: 17 },
  section: { gap: 12 },
  sectionHeading: { gap: 6 },
  sectionEyebrow: { color: arcadeColors.yellow, fontSize: 11, lineHeight: 13, letterSpacing: 1.2 },
  sectionTitle: { color: arcadeColors.white, fontSize: 18, lineHeight: 21 },
  sectionDescription: { color: arcadeColors.muted, fontSize: 13, lineHeight: 19 },
  card: { ...arcadeSurface, backgroundColor: arcadeColors.panel, padding: 12, gap: 16 },
  settingRow: { minHeight: 54, flexDirection: 'row', gap: 12, alignItems: 'center' },
  settingTitle: { color: arcadeColors.white, fontSize: 14, lineHeight: 20 },
  switch: { width: 48, height: 28, borderRadius: 9, borderWidth: 3, borderColor: arcadeColors.ink, backgroundColor: '#B91C1C', padding: 0, alignItems: 'flex-end', justifyContent: 'center' },
  switchOff: { backgroundColor: arcadeColors.panelSoft, alignItems: 'flex-start' },
  switchThumb: { width: 22, height: 22, borderRadius: 5, backgroundColor: arcadeColors.white },
  switchThumbOff: { backgroundColor: arcadeColors.muted },
  divider: { width: '100%', height: 1, backgroundColor: arcadeColors.ink },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, minWidth: 0, height: 40, borderWidth: 3, borderColor: arcadeColors.ink, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { backgroundColor: arcadeColors.yellow, boxShadow: '5px 5px 0px #000000' },
  segmentIcon: { width: 15, height: 15 },
  segmentText: { color: arcadeColors.muted, fontSize: 13, lineHeight: 16, fontWeight: '700' },
  segmentTextSelected: { color: arcadeColors.navy },
  stepper: { backgroundColor: arcadeColors.navy, borderWidth: 3, borderColor: arcadeColors.ink, padding: 9, gap: 8 },
  miniLabel: { color: arcadeColors.muted, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valueRow: { flexDirection: 'row', gap: 6, alignItems: 'baseline' },
  value: { color: arcadeColors.white, fontSize: 22, lineHeight: 26 },
  suffix: { color: arcadeColors.muted, fontSize: 13, lineHeight: 18 },
  stepperButtons: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 38, height: 38, borderWidth: 3, borderColor: arcadeColors.ink, backgroundColor: arcadeColors.panel, alignItems: 'center', justifyContent: 'center' },
  stepperIcon: { width: 18, height: 18 },
  hintRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  hintIcon: { width: 17, height: 17 },
  hintCopy: { flex: 1 },
  choice: { ...arcadeSurface, minHeight: 74, backgroundColor: arcadeColors.panel, padding: 8, gap: 12, flexDirection: 'row', alignItems: 'center' },
  choiceSelected: { backgroundColor: '#B91C1C' },
  choiceTitle: { color: arcadeColors.white, fontSize: 14, lineHeight: 19 },
  radio: { width: 22, height: 22 },
  emptyRadio: { width: 22, height: 22, borderWidth: 3, borderColor: arcadeColors.ink, backgroundColor: arcadeColors.navy },
  feedbackRow: { minHeight: 56, flexDirection: 'row', gap: 12, alignItems: 'center' },
  bottomActions: { gap: 8 },
  save: { ...arcadeSurface, height: 52, backgroundColor: arcadeColors.yellow, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  saveIcon: { width: 19, height: 19 },
  saveText: { color: arcadeColors.ink, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  cancel: { height: 38, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: arcadeColors.muted, fontSize: 14, lineHeight: 20 },
});
