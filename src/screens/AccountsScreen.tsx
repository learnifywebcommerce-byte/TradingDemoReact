import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type AccountPage =
  | 'Accounts'
  | 'Certificates'
  | 'Brokers'
  | 'ChangePassword';

type Props = {
  page: AccountPage;
  onChangePage: (page: AccountPage) => void;
  onBack: () => void;
  balance?: number;
  bottomTabs?: ReactNode;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

const blue = '#087CF1';

const account = {
  name: 'Webminix Dev',
  id: 'DEMO-1024',
  server: 'Sample Server',
  accessPoint: 'Access Server',
  mode: 'Hedge',
};

const broker = {
  name: 'The KF Market',
  code: 'TheKFMarket',
};

const passwordTypes = ['master', 'investor'] as const;
type PasswordType = (typeof passwordTypes)[number];

function Tool({
  icon,
  label,
  onPress,
  color = '#FFFFFF',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      style={styles.tool}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={24} color={color} />
    </Pressable>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <TextInput
      style={styles.passwordField}
      value={value}
      onChangeText={onChangeText}
      placeholder={label}
      placeholderTextColor="#757575"
      accessibilityLabel={label}
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
}

function ChangePasswordScreen({ onBack }: { onBack: () => void }) {
  const [passwordType, setPasswordType] = useState<PasswordType>('master');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const characterTypes = [/[a-z]/, /[A-Z]/, /[0-9]/].filter((pattern) =>
    pattern.test(newPassword),
  ).length;

  const meetsRequirements =
    newPassword.length >= 8 && characterTypes >= 2;

  const confirmationMatches = confirmation === newPassword;
  const canSubmit =
    currentPassword.length > 0 && meetsRequirements && confirmationMatches;

  const activeSegments = Math.min(
    4,
    Math.max(1, characterTypes + Number(newPassword.length >= 8)),
  );
  const strengthColor = meetsRequirements ? '#208052' : '#D34C43';

  function submitPasswordChange() {
    if (!canSubmit) return;

    setCurrentPassword('');
    setNewPassword('');
    setConfirmation('');

    Alert.alert(
      'Change password',
      'The form passed validation. A connected broker is required to change the password.',
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Tool icon="arrow-back-outline" label="Back to accounts" onPress={onBack} />
        <View style={styles.headerDetails}>
          <Text style={styles.title} accessibilityRole="header">
            Change password
          </Text>
          <Text style={styles.headerSubtitle}>
            {account.id}, {account.name}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.passwordForm}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={styles.passwordTypeRow}
            onPress={() => setTypePickerOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: typePickerOpen }}
          >
            <Text style={styles.passwordTypeText}>
              Change {passwordType} password
            </Text>
            <Ionicons
              name={typePickerOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={20}
              color="#526178"
            />
          </Pressable>

          {typePickerOpen && (
            <View style={styles.passwordTypeList}>
              {passwordTypes.map((type) => (
                <Pressable
                  key={type}
                  style={styles.menuRow}
                  accessibilityRole="button"
                  accessibilityState={{ selected: type === passwordType }}
                  onPress={() => {
                    setPasswordType(type);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmation('');
                    setTypePickerOpen(false);
                  }}
                >
                  <Text style={styles.menuText}>Change {type} password</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.passwordFields}>
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            {currentPassword.length === 0 && (
              <Text style={styles.validationText}>Password is not specified</Text>
            )}

            <PasswordField
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <View style={styles.strengthTrack}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.strengthSegment,
                    index < activeSegments && { backgroundColor: strengthColor },
                  ]}
                />
              ))}
            </View>

            {!meetsRequirements && (
              <Text style={styles.validationText}>
                {newPassword.length === 0
                  ? 'Password is not specified'
                  : 'Use at least 8 characters and two character types.'}
              </Text>
            )}

            <PasswordField
              label="Password confirmation"
              value={confirmation}
              onChangeText={setConfirmation}
            />
            {confirmation.length > 0 && !confirmationMatches && (
              <Text style={styles.validationText}>Passwords do not match</Text>
            )}
          </View>

          <Text style={styles.passwordHint}>
            Use at least 8 characters and at least two of these types:
            lowercase letters, uppercase letters, and digits.
          </Text>
        </ScrollView>

        <Pressable
          style={styles.doneButton}
          onPress={submitPasswordChange}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
        >
          <Text style={[styles.doneText, !canSubmit && styles.disabledText]}>
            DONE
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function AccountsScreen({
  page,
  onChangePage,
  onBack,
  balance = 5000,
  bottomTabs,
}: Props) {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountRemoved, setAccountRemoved] = useState(false);

  const amount = balance.toFixed(2).replace(/\B(?=(\d{3})+\.)/g, ' ');
  const brokerMatches = `${broker.name} ${broker.code}`
    .toLowerCase()
    .includes(query.trim().toLowerCase());

  function showProperties() {
    Alert.alert(
      'Properties',
      `${account.id} — ${account.name}\n\n` +
        `USD ${amount}, ${account.mode}\n` +
        `Access point: ${account.accessPoint}`,
    );
  }

  function openBrokers() {
    setQuery('');
    onChangePage('Brokers');
  }

  function showBroker() {
    Alert.alert(broker.name, 'This broker is listed for the demo.');
  }

  function openChangePassword() {
    setMenuOpen(false);
    onChangePage('ChangePassword');
  }

  function confirmClearPassword() {
    setMenuOpen(false);

    Alert.alert(
      'Clear saved password',
      `Clear the saved password for account ${account.id}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () =>
            Alert.alert('Clear saved password', 'This demo account has no saved password.'),
        },
      ],
      { cancelable: true },
    );
  }

  function confirmDeleteAccount() {
    setMenuOpen(false);

    Alert.alert(
      'Delete account',
      `Remove demo account ${account.id} from this account list?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => setAccountRemoved(true),
        },
      ],
      { cancelable: true },
    );
  }

  const accountActions = [
    { label: 'Change password', onPress: openChangePassword },
    { label: 'Clear saved password', onPress: confirmClearPassword },
    { label: 'Delete account', onPress: confirmDeleteAccount },
  ];

  if (page === 'ChangePassword') {
    return <ChangePasswordScreen onBack={onBack} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Tool
            icon={page === 'Accounts' ? 'menu-outline' : 'arrow-back-outline'}
            label={page === 'Accounts' ? 'Open sidebar' : 'Back to accounts'}
            onPress={onBack}
          />

          <Text style={[styles.title, styles.headerDetails]} accessibilityRole="header">
            {page}
          </Text>

          {page === 'Accounts' && (
            <>
              <Tool
                icon="ribbon-outline"
                label="Certificates"
                onPress={() => onChangePage('Certificates')}
              />
              <Tool icon="add-outline" label="Find a broker" onPress={openBrokers} />
              {!accountRemoved && (
                <Tool
                  icon="ellipsis-vertical"
                  label="Account options"
                  onPress={() => setMenuOpen(true)}
                />
              )}
            </>
          )}

          {page === 'Certificates' && (
            <Tool
              icon="add-outline"
              label="Add certificate"
              onPress={() =>
                Alert.alert('Add certificate', 'Certificate import requires a certificate service.')
              }
            />
          )}
        </View>

        {page === 'Accounts' && (
          <ScrollView style={styles.body}>
            {accountRemoved ? (
              <Text style={styles.empty}>No accounts</Text>
            ) : (
              <>
                <View style={styles.blueBand} />
                <View style={styles.card}>
                  <View style={styles.accountIcon}>
                    <Ionicons name="trending-up-outline" size={36} color={blue} />
                  </View>

                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountDetails}>
                    {account.id} · {account.server}{'\n'}
                    {account.accessPoint} · {account.mode}
                  </Text>

                  <View style={styles.balanceRow}>
                    <Text style={styles.balance}>{amount} USD</Text>
                    <View style={styles.infoButton}>
                      <Tool
                        icon="information-circle-outline"
                        label="Account properties"
                        onPress={showProperties}
                        color="#526178"
                      />
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        )}

        {page === 'Certificates' && (
          <View style={styles.body}>
            <Text style={styles.empty}>No installed certificates</Text>
          </View>
        )}

        {page === 'Brokers' && (
          <>
            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
              <View style={styles.search}>
                <Ionicons name="search-outline" size={22} color="#526178" />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Find broker"
                  placeholderTextColor="#526178"
                  accessibilityLabel="Find broker"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {brokerMatches ? (
                <View style={styles.brokerRow}>
                  <Pressable
                    style={styles.brokerItem}
                    accessibilityRole="button"
                    onPress={showBroker}
                  >
                    <Ionicons name="trending-up-outline" size={28} color={blue} />
                    <View style={styles.brokerText}>
                      <Text style={styles.brokerName}>{broker.name}</Text>
                      <Text style={styles.brokerCode}>{broker.code}</Text>
                    </View>
                  </Pressable>

                  <Tool
                    icon="information-circle-outline"
                    label="Broker information"
                    onPress={showBroker}
                    color="#526178"
                  />
                </View>
              ) : (
                <Text style={styles.empty}>No matching brokers</Text>
              )}
            </ScrollView>

            <Pressable
              style={styles.footer}
              accessibilityRole="button"
              onPress={() =>
                Alert.alert('Broker search', 'The demo lists one sample broker.')
              }
            >
              <Text style={styles.footerText}>Can’t find your broker?</Text>
            </Pressable>
          </>
        )}

        {bottomTabs}

        {page === 'Accounts' && menuOpen && !accountRemoved && (
          <View style={styles.menuOverlay} accessibilityViewIsModal>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setMenuOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close account options"
            />

            <View style={styles.menu}>
              {accountActions.map(({ label, onPress }, index) => (
                <Pressable
                  key={label}
                  style={[styles.menuRow, index > 0 && styles.menuDivider]}
                  onPress={onPress}
                  accessibilityRole="button"
                >
                  <Text style={styles.menuText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: blue },
  content: { flex: 1, position: 'relative' },
  body: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  headerDetails: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 19, fontWeight: '600' },
  headerSubtitle: { color: '#FFFFFF', fontSize: 14, marginTop: 2 },
  tool: {
    width: 46,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 116,
    backgroundColor: blue,
  },
  card: {
    margin: 12,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    elevation: 3,
  },
  accountIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#E8F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: { marginTop: 12, color: '#172B44', fontSize: 19, fontWeight: '700' },
  accountDetails: {
    marginTop: 16,
    color: '#526178',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  balanceRow: {
    width: '100%',
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  balance: {
    color: '#172B44',
    fontSize: 23,
    fontWeight: '600',
    paddingHorizontal: 46,
    textAlign: 'center',
  },
  infoButton: { position: 'absolute', right: 0 },
  empty: {
    marginTop: 28,
    paddingHorizontal: 16,
    color: '#526178',
    fontSize: 16,
    textAlign: 'center',
  },
  menuOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  menu: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 224,
    maxWidth: '92%',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    elevation: 8,
  },
  menuRow: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9E2EE',
  },
  menuText: { color: '#172B44', fontSize: 16 },
  search: {
    margin: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    backgroundColor: '#EDF4FC',
  },
  searchInput: { flex: 1, minHeight: 48, color: '#172B44', fontSize: 16 },
  brokerRow: {
    marginHorizontal: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D9E2EE',
  },
  brokerItem: {
    flex: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brokerText: { flex: 1 },
  brokerName: { color: '#172B44', fontSize: 17, fontWeight: '700' },
  brokerCode: { color: '#0564C4', marginTop: 3 },
  footer: { padding: 16, backgroundColor: '#EDF4FC', alignItems: 'center' },
  footerText: { color: '#0564C4', fontWeight: '700' },
  passwordForm: { padding: 18, paddingBottom: 28 },
  passwordTypeRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D0D5DC',
  },
  passwordTypeText: { flex: 1, color: '#526178', fontSize: 17 },
  passwordTypeList: { backgroundColor: '#F0F5FC', borderRadius: 6 },
  passwordFields: { marginTop: 12 },
  passwordField: {
    minHeight: 54,
    marginTop: 12,
    color: '#172B44',
    fontSize: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#D0D5DC',
  },
  validationText: { marginTop: 4, color: '#B83C34', fontSize: 14 },
  strengthTrack: { flexDirection: 'row', gap: 4 },
  strengthSegment: { flex: 1, height: 4, backgroundColor: '#D0D5DC' },
  passwordHint: {
    marginTop: 28,
    color: '#526178',
    fontSize: 14,
    lineHeight: 20,
  },
  doneButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6F9',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D0D5DC',
  },
  doneText: { color: '#0564C4', fontSize: 17, fontWeight: '700' },
  disabledText: { color: '#767676' },
});