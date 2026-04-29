import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile, changePassword as changePasswordApi } from '@/services/api';
import BackButton from '@/components/BackButton';

export default function MyProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.phone_number || '',
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
      });
    }
  }, [user]);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0];
      handleImageUpdate(selectedImage.uri);
    }
  };

  const handleImageUpdate = async (uri: string) => {
    setIsUpdating(true);
    setErrors(prev => ({ ...prev, profile_image: '' }));
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpg`;

      // @ts-ignore
      formData.append('profile_image', { uri, name: filename, type });

      await updateProfile(formData);
      await refreshUser();
    } catch (error: any) {
      setErrors(prev => ({ ...prev, profile_image: 'Failed to synchronize profile image.' }));
    } finally {
      setIsUpdating(false);
    }
  };

  const isProfileChanged = 
    profileForm.first_name !== (user?.first_name || '') ||
    profileForm.last_name !== (user?.last_name || '') ||
    profileForm.phone_number !== (user?.phone_number || '');

  const isPasswordFilled = 
    passwordForm.currentPassword.length > 0 &&
    passwordForm.newPassword.length > 0 &&
    passwordForm.confirmPassword.length > 0;

  const handleProfileSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!profileForm.first_name) newErrors.first_name = 'First name is required.';
    if (!profileForm.last_name) newErrors.last_name = 'Last name is required.';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile(profileForm);
      await refreshUser();
      Alert.alert('Success', 'Profile information updated successfully.');
    } catch (error: any) {
      setErrors({ profile_general: 'An error occurred during profile update.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordUpdate = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    const newErrors: Record<string, string> = {};

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsUpdating(true);
    try {
      await changePasswordApi(currentPassword, newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      Alert.alert('Success', 'Security credentials updated successfully.');
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.response?.data?.current_password?.[0] || error.response?.data?.non_field_errors?.[0] || 'Security update failed.';
      setErrors({ currentPassword: detail });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <BackButton title='Edit Profile' color='gray' />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} disabled={isUpdating}>
            {user?.profile_image ? (
              <Image source={{ uri: user.profile_image }} style={styles.avatar} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Text style={styles.avatarInitial}>{user?.first_name?.[0] || user?.username?.[0]}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Feather name="camera" size={16} color="#fff" />
            </View>
            {isUpdating && <View style={styles.overlay}><ActivityIndicator color="#fff" /></View>}
          </TouchableOpacity>
          {errors.profile_image && <Text style={styles.errorTextCenter}>{errors.profile_image}</Text>}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Personal Information</Text>
            <View style={styles.card}>
              <InputGroup 
                label="First Name" 
                value={profileForm.first_name} 
                onChangeText={(t: string) => {
                  setProfileForm({...profileForm, first_name: t});
                  clearError('first_name');
                }} 
                error={errors.first_name}
              />
              <InputGroup 
                label="Last Name" 
                value={profileForm.last_name} 
                onChangeText={(t: string) => {
                  setProfileForm({...profileForm, last_name: t});
                  clearError('last_name');
                }} 
                error={errors.last_name}
              />
              <InputGroup 
                label="Phone Number" 
                value={profileForm.phone_number} 
                onChangeText={(t: string) => {
                  setProfileForm({...profileForm, phone_number: t});
                  clearError('phone_number');
                }} 
                keyboardType="phone-pad"
                error={errors.phone_number}
              />
              {errors.profile_general && <Text style={styles.errorTextBottom}>{errors.profile_general}</Text>}
              <TouchableOpacity 
                style={[
                  styles.primaryBtn, 
                  (!isProfileChanged || isUpdating) && styles.disabledBtn
                ]} 
                onPress={handleProfileSave} 
                disabled={!isProfileChanged || isUpdating}
              >
                {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Profile</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Password Settings</Text>
            <View style={styles.card}>
              <InputGroup 
                label="Current Password" 
                secureTextEntry 
                value={passwordForm.currentPassword}
                onChangeText={(t: string) => {
                  setPasswordForm({...passwordForm, currentPassword: t});
                  clearError('currentPassword');
                }}
                error={errors.currentPassword}
              />
              <View style={styles.divider} />
              <InputGroup 
                label="New Password" 
                secureTextEntry 
                value={passwordForm.newPassword}
                onChangeText={(t: string) => {
                  setPasswordForm({...passwordForm, newPassword: t});
                  clearError('newPassword');
                }}
                error={errors.newPassword}
              />
              <InputGroup 
                label="Confirm Password" 
                secureTextEntry 
                value={passwordForm.confirmPassword}
                onChangeText={(t: string) => {
                  setPasswordForm({...passwordForm, confirmPassword: t});
                  clearError('confirmPassword');
                }}
                error={errors.confirmPassword}
              />
              <TouchableOpacity 
                style={[
                  styles.primaryBtn, 
                  (!isPasswordFilled || isUpdating) && styles.disabledBtn
                ]} 
                onPress={handlePasswordUpdate} 
                disabled={!isPasswordFilled || isUpdating}
              >
                {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Password</Text>}
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const InputGroup = ({ label, secureTextEntry, error, ...props }: any) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={styles.inputBox}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput 
          style={[styles.input, error && styles.inputErrorBorder]} 
          placeholder={label}
          placeholderTextColor="#94A3B8" 
          secureTextEntry={isPassword && !isPasswordVisible}
          {...props} 
        />
        {isPassword && (
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Ionicons 
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color="#6750A4" 
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 4 },
  avatarContainer: { alignSelf: 'center', marginBottom: 12 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E2E8F0' },
  placeholderAvatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#6750A4', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 48, color: '#fff', fontWeight: '800' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#6750A4', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#F8FAFC' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  inputBox: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#6750A4', marginBottom: 6, marginLeft: 4 },
  inputWrapper: { justifyContent: 'center' },
  input: { 
    backgroundColor: '#fff', 
    borderRadius: 112, 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    fontSize: 15, 
    fontWeight: '600', 
    color: '#1E293B', 
    borderWidth: 1, 
    borderColor: "#6750A4" 
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '600',
  },
  errorTextBottom: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  errorTextCenter: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  eyeIcon: { position: 'absolute', right: 16 },
  primaryBtn: { backgroundColor: '#6750A4', borderRadius: 112, padding: 16, alignItems: 'center', marginTop: 8 },
  disabledBtn: { backgroundColor: '#E2E8F0', opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
});