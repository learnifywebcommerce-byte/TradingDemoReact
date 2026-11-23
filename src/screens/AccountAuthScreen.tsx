import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export type AuthMode = 'Register' | 'SignIn';

type Props = {
  mode: AuthMode;
  onBack: () => void;
  onSwitch: (mode: AuthMode) => void;
};

const background = require('../../assets/registration_background.png');

export default function AccountAuthScreen({ mode, onBack, onSwitch }: Props) {
  const registering = mode === 'Register';
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');

  const title = registering ? 'Account registration' : 'Sign in';
  const submitLabel = registering ? 'Get an Account' : 'Sign In';

  function switchForm() {
    setEmail('');
    setPassword('');
    setPasswordVisible(false);
    setError('');
    onSwitch(registering ? 'SignIn' : 'Register');
  }

  function submit() {
    if (!/^[A-Za-z0-9]+$/.test(login)) {
      setError('Enter a login using letters and digits without spaces.');
      return;
    }

    if (registering && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    if (!registering && !password.trim()) {
      setError('Enter your password.');
      return;
    }

    setError('');
    setPassword('');
    setPasswordVisible(false);
    Alert.alert(
      'Demo form validated',
      registering
        ? 'Account creation requires an authentication service.'
        : 'Sign-in requires an authentication service.',
    );
  }

  return (
    <ImageBackground source={background} resizeMode="cover" style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Messages"
        >
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {title}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <Text style={styles.brand}>TradingMobile</Text>
            <Text style={styles.subtitle}>Trading community</Text>

            <Text style={styles.label}>Login</Text>
            <TextInput
              style={styles.input}
              accessibilityLabel="Login"
              placeholder="Enter your login"
              placeholderTextColor="#526178"
              autoCapitalize="none"
              autoCorrect={false}
              value={login}
              onChangeText={(value) => {
                setLogin(value);
                setError('');
              }}
            />
            <Text style={styles.hint}>Use letters and digits without spaces.</Text>

            <Text style={styles.label}>{registering ? 'Email' : 'Password'}</Text>
            {registering ? (
              <TextInput
                key="email"
                style={styles.input}
                accessibilityLabel="Email"
                placeholder="Enter your email"
                placeholderTextColor="#526178"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setError('');
                }}
                onSubmitEditing={submit}
              />
            ) : (
              <View key="password" style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  accessibilityLabel="Password"
                  placeholder="Enter your password"
                  placeholderTextColor="#526178"
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setError('');
                  }}
                  onSubmitEditing={submit}
                />
                <Pressable
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                  onPress={() => setPasswordVisible((visible) => !visible)}
                >
                  <Ionicons
                    name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={23}
                    color="#365F9B"
                  />
                </Pressable>
              </View>
            )}

            {!!error && (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            )}

            <Pressable
              style={[styles.button, styles.primaryButton]}
              accessibilityRole="button"
              onPress={submit}
            >
              <Text style={styles.buttonText}>{submitLabel}</Text>
            </Pressable>

            <Text style={styles.divider}>or</Text>

            <Pressable
              style={[styles.button, styles.googleButton]}
              accessibilityRole="button"
              onPress={() =>
                Alert.alert('Sign in with Google', 'Google sign-in requires configuration.')
              }
            >
              <Text style={styles.buttonText}>Sign in with Google</Text>
            </Pressable>

            <Pressable
              style={styles.switchButton}
              accessibilityRole="button"
              onPress={switchForm}
            >
              <Text style={styles.switchText}>
                {registering ? 'Already have an account? ' : 'New to TradingMobile? '}
                <Text style={styles.switchLink}>{registering ? 'Sign in' : 'Register'}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#456DA7' },
  body: { flex: 1 },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#FFFFFF', fontSize: 19, fontWeight: '600' },
  iconButton: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32 },
  form: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  brand: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },
  subtitle: { color: '#FFFFFF', fontSize: 17, marginTop: 4, marginBottom: 28 },
  label: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  input: {
    minHeight: 54,
    backgroundColor: '#FFFFFF',
    color: '#172B44',
    paddingHorizontal: 14,
    borderRadius: 8,
    fontSize: 16,
  },
  hint: { color: '#FFFFFF', fontSize: 13, marginTop: 8, marginBottom: 20 },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  passwordInput: { flex: 1 },
  error: { color: '#FFFFFF', backgroundColor: '#802D3D', padding: 10, marginTop: 12 },
  button: { minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: '#FFC247', marginTop: 24 },
  googleButton: { backgroundColor: '#FFFFFF' },
  buttonText: { color: '#172B44', fontSize: 16, fontWeight: '700' },
  divider: { color: '#FFFFFF', textAlign: 'center', marginVertical: 14 },
  switchButton: { minHeight: 48, justifyContent: 'center', marginTop: 12 },
  switchText: { color: '#FFFFFF', textAlign: 'center', fontSize: 15 },
  switchLink: { color: '#FFD671', fontWeight: '700', textDecorationLine: 'underline' },
});