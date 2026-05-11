// Ficheiro: src/screens/auth/OTPVerifyScreen.tsx | Função: introdução do código OTP recebido (P3)
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { verifyOTP } from '@services/auth.service';
import { useUiHostStore } from '@store/uiHostStore';

type AuthStackParamList = {
  OTPVerify: { phone: string };
  Onboarding: undefined;
};

export default function OTPVerifyScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AuthStackParamList, 'OTPVerify'>>();
  const showToast = useUiHostStore((s) => s.showToast);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const phone = route.params?.phone ?? '';

  const handleVerify = async () => {
    if (!code.trim()) {
      showToast({ message: 'Introduz o código recebido por SMS.', tone: 'error' });
      return;
    }

    setIsVerifying(true);
    try {
      await verifyOTP(phone, code.trim());
      navigation.navigate('Onboarding' as never);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao verificar o código.';
      showToast({ message, tone: 'error' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Verificação de SMS</Text>
        <Text style={styles.subtitle}>Introduz o código que recebeste em {phone}</Text>

        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={code}
          onChangeText={setCode}
          placeholder="Código OTP"
          placeholderTextColor="#9CA3AF"
          maxLength={6}
        />

        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={isVerifying}>
          <Text style={styles.buttonText}>{isVerifying ? 'A verificar...' : 'Verificar código'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    color: '#4B5563',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    padding: 16,
    color: '#111827',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
