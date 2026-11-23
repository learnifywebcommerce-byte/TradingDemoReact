import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  onOpenMenu: () => void;
  onRegister?: () => void;
  onSignIn?: () => void;
  deviceId?: string;
};

const blue = '#087CF1';

export default function MessagesScreen({
  onOpenMenu,
  onRegister,
  onSignIn,
  deviceId = 'TM-10428',
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [idOpen, setIdOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!searchOpen || idOpen) return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setSearchOpen(false);
        setQuery('');
        return true;
      },
    );

    return () => subscription.remove();
  }, [searchOpen, idOpen]);

  function toggleSearch() {
    setSearchOpen(!searchOpen);
    setQuery('');
  }

  function openDeviceId() {
    setCopied(false);
    setIdOpen(true);
  }

  async function copyDeviceId() {
    try {
      const success = await Clipboard.setStringAsync(deviceId);
      if (!success) {
        Alert.alert('Copy unavailable', 'Touch and hold the ID to copy it.');
        return;
      }
      setCopied(true);
    } catch {
      Alert.alert('Copy unavailable', 'Touch and hold the ID to copy it.');
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={onOpenMenu}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu-outline" size={26} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.title} accessibilityRole="header">
          Messages
        </Text>

        <Pressable
          style={styles.headerButton}
          onPress={openDeviceId}
          accessibilityRole="button"
          accessibilityLabel="Show device ID"
        >
          <Text style={styles.idBadge}>ID</Text>
        </Pressable>

        <Pressable
          style={styles.headerButton}
          onPress={toggleSearch}
          accessibilityRole="button"
          accessibilityLabel={searchOpen ? 'Close search' : 'Search messages'}
        >
          <Ionicons
            name={searchOpen ? 'close-outline' : 'search-outline'}
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {searchOpen ? (
        <View style={styles.searchContent}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={19} color="#546579" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages"
              placeholderTextColor="#546579"
              accessibilityLabel="Search messages"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>
          {query.trim().length > 0 && (
            <Text style={styles.searchResult}>No matching messages</Text>
          )}
        </View>
      ) : (
        <>
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses" size={108} color="#CED9E5" />
            <Text style={styles.emptyLabel}>No messages</Text>
          </View>

          <View style={styles.accountActions}>
            <Pressable
              style={[styles.accountButton, styles.registerButton]}
              accessibilityRole="button"
              onPress={
                onRegister ??
                (() => Alert.alert('Register', 'Registration is unavailable in demo mode.'))
              }
            >
              <Text style={styles.registerLabel}>Register</Text>
            </Pressable>

            <Pressable
              style={[styles.accountButton, styles.signInButton]}
              accessibilityRole="button"
              onPress={
                onSignIn ??
                (() => Alert.alert('Sign in', 'Sign-in is unavailable in demo mode.'))
              }
            >
              <Text style={styles.signInLabel}>Sign in</Text>
            </Pressable>
          </View>
        </>
      )}

      <Modal
        visible={idOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIdOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIdOpen(false)}
            accessible={false}
          />

          <View style={styles.dialog} accessibilityViewIsModal>
            <Text style={styles.dialogTitle} accessibilityRole="header">
              TradingMobile Device ID
            </Text>

            <Text selectable style={styles.deviceId}>
              {deviceId}
            </Text>

            <Text style={styles.dialogBody}>
              This identifier is used for device notifications.
            </Text>

            <View style={styles.dialogActions}>
              <Pressable
                style={[styles.dialogButton, styles.copyButton]}
                accessibilityRole="button"
                onPress={copyDeviceId}
              >
                <Text style={styles.signInLabel}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.dialogButton, styles.doneButton]}
                accessibilityRole="button"
                onPress={() => setIdOpen(false)}
              >
                <Text style={styles.doneLabel}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: blue,
  },
  headerButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  idBadge: {
    color: '#FFFFFF',
    backgroundColor: '#FFFFFF30',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyLabel: { color: '#546579', fontSize: 17 },
  accountActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F4F8FC',
  },
  accountButton: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButton: { flex: 2, backgroundColor: '#FFC247' },
  signInButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: blue,
    backgroundColor: '#FFFFFF',
  },
  registerLabel: { color: '#30250D', fontSize: 15, fontWeight: '700' },
  signInLabel: { color: '#0564C4', fontSize: 15, fontWeight: '700' },
  searchContent: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#EDF4FC',
  },
  searchInput: { flex: 1, minHeight: 46, color: '#172B44', fontSize: 16 },
  searchResult: { marginTop: 18, color: '#546579', textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14233880',
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  dialogTitle: { color: '#172B44', fontSize: 20, fontWeight: '700' },
  deviceId: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#EDF4FC',
    color: '#172B44',
    fontSize: 19,
    textAlign: 'center',
    fontWeight: '600',
  },
  dialogBody: { marginTop: 12, color: '#546579', lineHeight: 21 },
  dialogActions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  dialogButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButton: { borderWidth: 1, borderColor: blue },
  doneButton: { backgroundColor: '#0564C4' },
  doneLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});